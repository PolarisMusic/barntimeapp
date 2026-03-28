import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { EditableServiceItem } from "@/components/portal/editable-service-item";

export default async function ServicesPage({
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

  const { data: services } = await supabase
    .from("event_services")
    .select("*, accounts(name)")
    .eq("event_id", id)
    .order("created_at");

  const [{ data: canManageServices }, { data: canConfirm }] = await Promise.all([
    supabase.rpc("can_manage_services", { p_event_id: id }),
    supabase.rpc("can_confirm_vendor", { p_event_id: id }),
  ]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {services && services.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {services.map((s) => (
            <EditableServiceItem
              key={s.id}
              service={{
                id: s.id,
                name: s.name,
                description: s.description,
                status: s.status,
                accountName:
                  (s.accounts as unknown as { name: string })?.name || null,
              }}
              canEditNotes={canManageServices === true}
              canConfirm={canConfirm === true}
            />
          ))}
        </div>
      ) : (
        <p className="p-8 text-center text-sm text-gray-500">
          No services available for this event.
        </p>
      )}
    </div>
  );
}
