import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export default async function AdminVideosPage() {
  await requireAdmin();
  const supabase = await createServiceClient();

  const { data: videos } = await supabase
    .from("videos")
    .select("id, title, is_published, display_order, event_id, events(name), updated_at")
    .order("display_order", { ascending: true })
    .order("updated_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Videos</h1>
        <Link
          href="/admin/videos/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Video
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {videos?.map((video) => {
              const event = video.events as unknown as { name: string } | null;
              return (
                <tr key={video.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/videos/${video.id}`}
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      {video.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {event?.name ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {video.display_order}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        video.is_published
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {video.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {(!videos || videos.length === 0) && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  No videos yet.{" "}
                  <Link
                    href="/admin/videos/new"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Create one
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
