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

  const { data: assignments } = await supabase
    .from("event_contact_roles")
    .select(
      "id, role_label, visibility, sort_order, account_contacts(name, email, phone, role_label, accounts(name))"
    )
    .eq("event_id", id)
    .order("sort_order");

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {assignments && assignments.length > 0 ? (
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
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {contact?.name || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {a.role_label && (
                        <span className="font-medium text-gray-600">
                          {a.role_label}
                        </span>
                      )}
                      {a.role_label && contact?.accounts?.name && " · "}
                      {contact?.accounts?.name || ""}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    {contact?.email && <p>{contact.email}</p>}
                    {contact?.phone && <p>{contact.phone}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="p-8 text-center text-sm text-gray-500">
          No shared contacts available for this event.
        </p>
      )}
    </div>
  );
}
