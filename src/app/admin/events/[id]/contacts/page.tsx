import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { AssignContactForm } from "@/components/admin/assign-contact-form";
import { EventContactRow } from "@/components/admin/event-contact-row";

export default async function EventContactsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, owner_account_id")
    .eq("id", id)
    .single();

  if (!event) notFound();

  // Get existing event contact assignments
  const { data: assignments } = await supabase
    .from("event_contact_roles")
    .select("*, account_contacts(id, name, email, phone, role_label, account_id, accounts(name))")
    .eq("event_id", id)
    .order("sort_order");

  // Get available contacts from owner + participant accounts
  const { data: participants } = await supabase
    .from("event_accounts")
    .select("account_id")
    .eq("event_id", id);

  const accountIds = [
    event.owner_account_id,
    ...(participants?.map((p) => p.account_id) || []),
  ];

  const { data: availableContacts } = await supabase
    .from("account_contacts")
    .select("id, name, email, role_label, account_id, accounts(name)")
    .in("account_id", accountIds)
    .order("name");

  // Filter out already-assigned contacts
  const assignedIds = new Set(
    assignments?.map((a) => (a.account_contacts as unknown as { id: string })?.id) ?? []
  );
  const unassignedContacts = (availableContacts?.filter((c) => !assignedIds.has(c.id)) ?? []).map(
    (c) => ({
      ...c,
      accounts: Array.isArray(c.accounts) ? c.accounts[0] ?? null : c.accounts,
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/events/${id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; {event.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Event Contacts</h1>
      </div>

      <AssignContactForm eventId={id} contacts={unassignedContacts || []} />

      <div className="rounded-lg border border-gray-200 bg-white">
        {assignments && assignments.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {assignments.map((a) => {
              const contact = a.account_contacts as unknown as {
                id: string;
                name: string;
                email: string | null;
                phone: string | null;
                role_label: string | null;
                accounts: { name: string };
              };
              return (
                <EventContactRow
                  key={a.id}
                  assignmentId={a.id}
                  eventId={id}
                  contactName={contact?.name || "Unknown"}
                  contactEmail={contact?.email || null}
                  contactPhone={contact?.phone || null}
                  accountName={contact?.accounts?.name || "Unknown"}
                  roleLabel={a.role_label}
                  visibility={a.visibility}
                />
              );
            })}
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">
            No contacts assigned to this event yet.
          </p>
        )}
      </div>
    </div>
  );
}
