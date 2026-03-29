import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { ContactForm } from "@/components/admin/contact-form";
import { ContactRow } from "@/components/admin/contact-row";

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!account) notFound();

  const { data: contacts } = await supabase
    .from("account_contacts")
    .select("*")
    .eq("account_id", id)
    .order("created_at");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/accounts/${id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; {account.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Contacts</h1>
      </div>

      <ContactForm accountId={id} />

      <div className="rounded-lg border border-gray-200 bg-white">
        {contacts && contacts.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {contacts.map((c) => (
              <ContactRow key={c.id} contact={c} />
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">No contacts yet.</p>
        )}
      </div>
    </div>
  );
}
