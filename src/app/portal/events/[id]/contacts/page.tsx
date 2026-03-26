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
    .select("id, name")
    .eq("id", id)
    .single();

  if (!event) notFound();

  // Get event-scoped contact assignments (RLS handles visibility)
  const { data: assignments } = await supabase
    .from("event_contact_roles")
    .select(
      "id, role_label, visibility, sort_order, account_contacts(name, email, phone, role_label, accounts(name))"
    )
    .eq("event_id", id)
    .order("sort_order");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/portal/events/${id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; {event.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Contacts</h1>
      </div>

      {assignments && assignments.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="divide-y divide-gray-100">
            {assignments.map((a) => {
              const contact = a.account_contacts as unknown as {
                name: string;
                email: string | null;
                phone: string | null;
                role_label: string | null;
                accounts: { name: string };
              };
              return (
                <div key={a.id} className="p-4">
                  <p className="text-sm font-medium">
                    {contact?.name || "Unknown"}
                    {a.role_label && (
                      <span className="ml-2 text-gray-500">
                        — {a.role_label}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {contact?.accounts?.name || ""}
                    {contact?.email ? ` | ${contact.email}` : ""}
                    {contact?.phone ? ` | ${contact.phone}` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          No contacts assigned to this event yet.
        </p>
      )}
    </div>
  );
}
