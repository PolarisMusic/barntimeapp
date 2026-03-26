import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { ServiceForm } from "@/components/admin/service-form";
import { ServiceRow } from "@/components/admin/service-row";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: event } = await supabase.from("events").select("id, name").eq("id", id).single();
  if (!event) notFound();

  const { data: services } = await supabase
    .from("event_services")
    .select("*, accounts(name)")
    .eq("event_id", id)
    .order("created_at");

  // Get linked accounts (participants + owner) for vendor selection
  const { data: eventData } = await supabase.from("events").select("owner_account_id").eq("id", id).single();
  const { data: participants } = await supabase.from("event_accounts").select("account_id, accounts(id, name)").eq("event_id", id);

  const vendorAccounts: { id: string; name: string }[] = [];
  if (participants) {
    participants.forEach((p) => {
      const acc = p.accounts as unknown as { id: string; name: string };
      if (acc) vendorAccounts.push(acc);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/events/${id}`} className="text-sm text-gray-500 hover:text-gray-700">&larr; {event.name}</Link>
        <h1 className="mt-1 text-2xl font-bold">Services</h1>
      </div>

      <ServiceForm eventId={id} accounts={vendorAccounts} />

      <div className="rounded-lg border border-gray-200 bg-white">
        {services && services.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {services.map((s) => (
              <ServiceRow
                key={s.id}
                service={{
                  ...s,
                  vendor_name: (s.accounts as unknown as { name: string })?.name || null,
                }}
              />
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">No services yet.</p>
        )}
      </div>
    </div>
  );
}
