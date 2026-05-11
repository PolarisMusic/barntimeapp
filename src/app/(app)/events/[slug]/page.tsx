import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { extractYouTubeId, youTubeThumbnailUrl } from "@/lib/youtube";

export const dynamic = "force-dynamic";

function formatDate(d: string | null) {
  if (!d) return "Date TBA";
  return new Date(d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatPrice(cents: number | null) {
  if (cents == null) return null;
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function formatReveal(at: string | null) {
  if (!at) return null;
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function PublicEventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, public_slug, public_summary, hero_image_url, start_date, end_date, ticketing_enabled, ticket_price_cents, ticket_capacity, address_reveal_at"
    )
    .eq("public_slug", slug)
    .eq("is_public", true)
    .in("status", ["active", "finalized"])
    .maybeSingle();

  if (!event) notFound();

  const { data: videoRows } = await supabase
    .from("videos")
    .select("id, title, caption, youtube_url")
    .eq("is_published", true)
    .eq("event_id", event.id)
    .order("display_order", { ascending: true });

  type LinkedVideo = {
    id: string;
    title: string;
    caption: string | null;
    youtubeId: string;
  };
  const linkedVideos = (videoRows || [])
    .map((v): LinkedVideo | null => {
      const id = extractYouTubeId(v.youtube_url);
      if (!id) return null;
      return {
        id: v.id,
        title: v.title,
        caption: v.caption,
        youtubeId: id,
      };
    })
    .filter((v): v is LinkedVideo => v !== null);

  const price = formatPrice(event.ticket_price_cents);
  const revealAt = formatReveal(event.address_reveal_at);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/events"
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← All events
      </Link>

      <div
        className="mt-4 aspect-[16/9] w-full overflow-hidden rounded-lg bg-gray-100 bg-cover bg-center"
        style={
          event.hero_image_url
            ? { backgroundImage: `url(${event.hero_image_url})` }
            : undefined
        }
      />

      <h1 className="mt-6 text-3xl font-bold leading-tight">{event.name}</h1>
      <p className="mt-1 text-gray-500">{formatDate(event.start_date)}</p>

      {event.public_summary && (
        <p className="mt-4 whitespace-pre-line text-gray-700">
          {event.public_summary}
        </p>
      )}

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Location
        </h2>
        <p className="mt-2 text-gray-700">
          {revealAt
            ? `Address revealed ${revealAt}`
            : "Address revealed close to the event."}
        </p>
      </div>

      {event.ticketing_enabled ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Tickets</h2>
            {price && <span className="text-lg font-semibold">{price}</span>}
          </div>
          {event.ticket_capacity != null && (
            <p className="mt-1 text-sm text-gray-500">
              Limited to {event.ticket_capacity} attendees.
            </p>
          )}
          <button
            type="button"
            disabled
            className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-60"
          >
            Ticketing coming soon
          </button>
        </div>
      ) : null}

      {linkedVideos.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Related videos
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {linkedVideos.map((v) => (
              <Link
                key={v.id}
                href="/videos"
                className="block aspect-[9/16] overflow-hidden rounded-md bg-cover bg-center"
                style={{ backgroundImage: `url(${youTubeThumbnailUrl(v.youtubeId)})` }}
                title={v.title}
              >
                <span className="sr-only">{v.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
