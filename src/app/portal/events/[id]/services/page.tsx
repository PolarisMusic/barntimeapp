import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { PortalConfirmVendorButton } from "@/components/portal/confirm-vendor-button";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, owner_account_id")
    .eq("id", id)
    .single();

  if (!event) notFound();

  const { data: services } = await supabase
    .from("event_services")
    .select("*, accounts(name)")
    .eq("event_id", id)
    .order("created_at");

  // Check if user has vendor.confirm permission through their account membership
  // We check server-side via a query that mimics the helper function
  const { data: canConfirm } = await supabase.rpc("can_confirm_vendor", {
    p_event_id: id,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/portal/events/${id}`} className="text-sm text-gray-500 hover:text-gray-700">&larr; {event.name}</Link>
        <h1 className="mt-1 text-2xl font-bold">Services</h1>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        {services && services.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-gray-500">
                    {(s.accounts as unknown as { name: string })?.name || "No vendor"}{s.description ? ` — ${s.description}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={s.status} />
                  {canConfirm && s.status === "pending" && (
                    <PortalConfirmVendorButton serviceId={s.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">No services yet.</p>
        )}
      </div>
    </div>
  );
}
