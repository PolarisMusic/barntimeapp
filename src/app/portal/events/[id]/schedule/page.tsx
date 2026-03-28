import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { EditableScheduleItem } from "@/components/portal/editable-schedule-item";

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

  // Route guard: limited participants cannot access schedule
  const { data: summaryRows } = await supabase.rpc("event_summary", {
    p_event_id: id,
  });
  const summary = summaryRows?.[0];
  if (summary && !summary.is_owner && summary.participant_visibility_level === "limited") {
    redirect(`/portal/events/${id}`);
  }

  const { data: items } = await supabase
    .from("event_schedule_items")
    .select("*, event_locations(name)")
    .eq("event_id", id)
    .order("sort_order")
    .order("start_time");

  const { data: canManage } = await supabase.rpc("can_manage_schedule", {
    p_event_id: id,
  });
  const isOwner = summary?.is_owner === true;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {items && items.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <EditableScheduleItem
              key={item.id}
              item={{
                id: item.id,
                title: item.title,
                start_time: item.start_time,
                end_time: item.end_time,
                description: item.description,
                locationName:
                  (item.event_locations as unknown as { name: string })?.name ||
                  null,
              }}
              canEdit={canManage === true}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500">
            {canManage
              ? "No schedule items yet. Add items from the admin panel to build the event timeline."
              : isOwner
                ? "No schedule items have been added to this event yet."
                : "The event schedule will appear here once the organizer adds timeline items."}
          </p>
        </div>
      )}
    </div>
  );
}
