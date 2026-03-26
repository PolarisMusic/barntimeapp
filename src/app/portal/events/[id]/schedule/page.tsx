import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireProfile();
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!event) notFound();

  const { data: items } = await supabase
    .from("event_schedule_items")
    .select("*, event_locations(name)")
    .eq("event_id", id)
    .order("sort_order")
    .order("start_time");

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/portal/events/${id}`} className="text-sm text-gray-500 hover:text-gray-700">&larr; {event.name}</Link>
        <h1 className="mt-1 text-2xl font-bold">Schedule</h1>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        {items && items.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {items.map((item) => (
              <div key={item.id} className="p-4">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-gray-500">
                  {formatTime(item.start_time)} — {formatTime(item.end_time)}
                  {(item.event_locations as unknown as { name: string })?.name &&
                    ` @ ${(item.event_locations as unknown as { name: string }).name}`}
                </p>
                {item.description && (
                  <p className="mt-1 text-xs text-gray-400">{item.description}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">No schedule items yet.</p>
        )}
      </div>
    </div>
  );
}
