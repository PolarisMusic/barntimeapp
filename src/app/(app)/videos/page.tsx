import { createClient } from "@/lib/supabase/server";
import { extractYouTubeId } from "@/lib/youtube";
import { VideoFeed, type FeedVideo } from "@/components/app/video-feed";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("videos")
    .select(
      "id, title, caption, youtube_url, event_id, events(public_slug, name, is_public)"
    )
    .eq("is_published", true)
    .order("display_order", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false });

  const videos: FeedVideo[] = (rows || [])
    .map((row) => {
      const youtubeId = extractYouTubeId(row.youtube_url);
      if (!youtubeId) return null;
      const event = row.events as unknown as
        | { public_slug: string | null; name: string | null; is_public: boolean | null }
        | null;
      const eventSlug =
        event && event.is_public && event.public_slug ? event.public_slug : null;
      const eventName = event?.name ?? null;
      return {
        id: row.id,
        title: row.title,
        caption: row.caption,
        youtubeId,
        eventSlug,
        eventName,
      };
    })
    .filter((v): v is FeedVideo => v !== null);

  if (videos.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-16 text-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">No videos yet</h1>
          <p className="mt-2 text-sm text-gray-500">
            Check back soon for the latest from Barn Time.
          </p>
        </div>
      </div>
    );
  }

  return <VideoFeed videos={videos} />;
}
