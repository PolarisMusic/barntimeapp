import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { ScheduleItemForm } from "@/components/admin/schedule-item-form";
import { ScheduleItemRow } from "@/components/admin/schedule-item-row";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: event } = await supabase.from("events").select("id, name").eq("id", id).single();
  if (!event) notFound();

  const { data: items } = await supabase
    .from("event_schedule_items")
    .select("*, event_locations(name)")
    .eq("event_id", id)
    .order("sort_order")
    .order("start_time");

  const { data: locations } = await supabase
    .from("event_locations")
    .select("id, name")
    .eq("event_id", id);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/events/${id}`} className="text-sm text-gray-500 hover:text-gray-700">&larr; {event.name}</Link>
        <h1 className="mt-1 text-2xl font-bold">Schedule</h1>
      </div>

      <ScheduleItemForm eventId={id} locations={locations || []} />

      <div className="rounded-lg border border-gray-200 bg-white">
        {items && items.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {items.map((item) => (
              <ScheduleItemRow
                key={item.id}
                item={{
                  ...item,
                  location_name: (item.event_locations as unknown as { name: string })?.name || null,
                }}
              />
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">No schedule items yet.</p>
        )}
      </div>
    </div>
  );
}
