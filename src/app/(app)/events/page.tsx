import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatDate(d: string | null) {
  if (!d) return "Date TBA";
  return new Date(d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPrice(cents: number | null) {
  if (cents == null) return null;
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default async function PublicEventsPage() {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select(
      "id, name, public_slug, public_summary, hero_image_url, start_date, end_date, ticketing_enabled, ticket_price_cents, ticket_capacity"
    )
    .eq("is_public", true)
    .in("status", ["active", "finalized"])
    .order("start_date", { ascending: true });

  const upcoming = events?.filter((e) => e.public_slug) || [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Public Events</h1>
      <p className="mt-1 text-sm text-gray-500">
        Limited capacity. Address revealed close to the event.
      </p>

      {upcoming.length === 0 ? (
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No public events scheduled right now.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.public_slug}`}
              className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:border-blue-300 hover:shadow-md"
            >
              <div
                className="aspect-[16/9] w-full bg-gray-100 bg-cover bg-center"
                style={
                  event.hero_image_url
                    ? { backgroundImage: `url(${event.hero_image_url})` }
                    : undefined
                }
              />
              <div className="flex flex-1 flex-col p-4">
                <h2 className="font-semibold leading-tight text-gray-900">
                  {event.name}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {formatDate(event.start_date)}
                </p>
                {event.public_summary && (
                  <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                    {event.public_summary}
                  </p>
                )}
                {event.ticketing_enabled && (
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                      {formatPrice(event.ticket_price_cents) ?? "Tickets"}
                    </span>
                    {event.ticket_capacity != null && (
                      <span className="text-gray-500">
                        {event.ticket_capacity} seats
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
