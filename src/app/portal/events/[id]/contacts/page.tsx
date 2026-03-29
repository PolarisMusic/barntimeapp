import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { getAssignableContacts } from "@/lib/actions/contacts";
import { EditableContactItem } from "@/components/portal/editable-contact-item";
import { ContactAssignForm } from "@/components/portal/contact-assign-form";

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireProfile();
  const { id } = await params;
  const supabase = await createClient();

  const { data: summaryRows } = await supabase.rpc("event_summary", {
    p_event_id: id,
  });
  const summary = summaryRows?.[0];
  if (!summary) notFound();

  const canManageContacts = summary.can_manage_contacts === true;
  const isOwner = summary.is_owner === true;

  const { data: assignments } = await supabase
    .from("event_contact_roles")
    .select(
      "id, role_label, visibility, sort_order, account_contacts(id, name, email, phone, role_label, accounts(name))"
    )
    .eq("event_id", id)
    .order("sort_order");

  // For users with manage permission, fetch unassigned contacts
  // from owner + participant account directories
  const availableContacts = canManageContacts
    ? await getAssignableContacts(id)
    : [];

  const contactItems = (assignments || []).map((a) => {
    const contact = a.account_contacts as unknown as {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      role_label: string | null;
      accounts: { name: string };
    };
    return {
      id: a.id,
      role_label: a.role_label,
      visibility: a.visibility,
      contact: {
        name: contact?.name || "Unknown",
        email: contact?.email || null,
        phone: contact?.phone || null,
        role_label: contact?.role_label || null,
        accountName: contact?.accounts?.name || "",
      },
    };
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {contactItems.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {contactItems.map((item) => (
            <EditableContactItem
              key={item.id}
              assignment={item}
              eventId={id}
              canManage={canManageContacts}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500">
            {canManageContacts
              ? "No contacts assigned yet. Use the button below to assign contacts from linked account directories."
              : isOwner
                ? "No contacts have been assigned to this event yet."
                : "No shared contacts are available for this event. The event owner manages contact assignments."}
          </p>
        </div>
      )}

      {canManageContacts && (
        <ContactAssignForm
          eventId={id}
          availableContacts={availableContacts}
        />
      )}
    </div>
  );
}
