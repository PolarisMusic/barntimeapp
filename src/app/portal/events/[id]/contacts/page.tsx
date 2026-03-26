import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireProfile();
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, owner_account_id")
    .eq("id", id)
    .single();

  if (!event) notFound();

  // Get contacts from the owner account
  const { data: ownerContacts } = await supabase
    .from("account_contacts")
    .select("*")
    .eq("account_id", event.owner_account_id)
    .order("name");

  // Get contacts from participant accounts
  const { data: participantAccounts } = await supabase
    .from("event_accounts")
    .select("account_id, accounts(name), role_label")
    .eq("event_id", id);

  const participantAccountIds = participantAccounts?.map((p) => p.account_id) || [];

  let participantContacts: { name: string; email: string | null; phone: string | null; role_label: string | null; account_name: string }[] = [];
  if (participantAccountIds.length > 0) {
    const { data } = await supabase
      .from("account_contacts")
      .select("name, email, phone, role_label, account_id, accounts(name)")
      .in("account_id", participantAccountIds)
      .order("name");

    participantContacts = (data || []).map((c) => ({
      name: c.name,
      email: c.email,
      phone: c.phone,
      role_label: c.role_label,
      account_name: (c.accounts as unknown as { name: string })?.name || "Unknown",
    }));
  }

  // Get event locations as well
  const { data: locations } = await supabase
    .from("event_locations")
    .select("*")
    .eq("event_id", id)
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/portal/events/${id}`} className="text-sm text-gray-500 hover:text-gray-700">&larr; {event.name}</Link>
        <h1 className="mt-1 text-2xl font-bold">Contacts & Locations</h1>
      </div>

      {/* Locations */}
      {locations && locations.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold">Locations</h2>
          <div className="divide-y divide-gray-100">
            {locations.map((l) => (
              <div key={l.id} className="py-2">
                <p className="text-sm font-medium">{l.name}</p>
                {l.address && <p className="text-xs text-gray-500">{l.address}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Owner account contacts */}
      {ownerContacts && ownerContacts.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold">Event Contacts</h2>
          <div className="divide-y divide-gray-100">
            {ownerContacts.map((c) => (
              <div key={c.id} className="py-2">
                <p className="text-sm font-medium">{c.name}{c.role_label ? ` — ${c.role_label}` : ""}</p>
                <p className="text-xs text-gray-500">
                  {[c.email, c.phone].filter(Boolean).join(" | ") || "No contact info"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Participant contacts */}
      {participantContacts.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold">Vendor & Partner Contacts</h2>
          <div className="divide-y divide-gray-100">
            {participantContacts.map((c, i) => (
              <div key={i} className="py-2">
                <p className="text-sm font-medium">{c.name}{c.role_label ? ` — ${c.role_label}` : ""}</p>
                <p className="text-xs text-gray-500">
                  {c.account_name} | {[c.email, c.phone].filter(Boolean).join(" | ") || "No contact info"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {(!ownerContacts || ownerContacts.length === 0) && participantContacts.length === 0 && (!locations || locations.length === 0) && (
        <p className="text-gray-500">No contacts or locations available yet.</p>
      )}
    </div>
  );
}
