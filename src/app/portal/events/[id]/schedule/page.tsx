import { notFound } from "next/navigation";
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

  const { data: items } = await supabase
    .from("event_schedule_items")
    .select("*, event_locations(name)")
    .eq("event_id", id)
    .order("sort_order")
    .order("start_time");

  const { data: canManage } = await supabase.rpc("can_manage_schedule", {
    p_event_id: id,
  });

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
        <p className="p-8 text-center text-sm text-gray-500">
          No schedule items yet.
        </p>
      )}
    </div>
  );
}
