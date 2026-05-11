"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createVideo, updateVideo, deleteVideo } from "@/lib/actions/videos";
import { FormButton } from "@/components/ui/form-button";

type EventOption = { id: string; name: string };

type Video = {
  id: string;
  title: string;
  caption: string | null;
  youtube_url: string;
  event_id: string | null;
  display_order: number;
  is_published: boolean;
};

export function VideoForm({
  video,
  events,
}: {
  video?: Video;
  events: EventOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSuccess(false);
    const result = video
      ? await updateVideo(video.id, formData)
      : await createVideo(formData);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    if (!video && result.data) {
      router.push(`/admin/videos/${result.data.id}`);
    } else {
      setSuccess(true);
    }
  }

  async function handleDelete() {
    if (!video) return;
    if (!confirm("Delete this video? This cannot be undone.")) return;
    const result = await deleteVideo(video.id);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/admin/videos");
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
    >
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={video?.title || ""}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="youtube_url" className="mb-1 block text-sm font-medium">
          YouTube URL
        </label>
        <input
          id="youtube_url"
          name="youtube_url"
          type="url"
          required
          defaultValue={video?.youtube_url || ""}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="caption" className="mb-1 block text-sm font-medium">
          Caption
        </label>
        <textarea
          id="caption"
          name="caption"
          rows={2}
          defaultValue={video?.caption || ""}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="event_id" className="mb-1 block text-sm font-medium">
            Linked Event (optional)
          </label>
          <select
            id="event_id"
            name="event_id"
            defaultValue={video?.event_id || ""}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">— None —</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="display_order"
            className="mb-1 block text-sm font-medium"
          >
            Display Order
          </label>
          <input
            id="display_order"
            name="display_order"
            type="number"
            step="1"
            defaultValue={video?.display_order ?? 0}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_published"
          name="is_published"
          type="checkbox"
          defaultChecked={video?.is_published ?? false}
        />
        <label htmlFor="is_published" className="text-sm">
          Published (visible in the public feed)
        </label>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Video saved.
        </div>
      )}

      <div className="flex items-center justify-between">
        <FormButton>{video ? "Save Changes" : "Create Video"}</FormButton>
        {video && (
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
