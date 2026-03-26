import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { AccountEditForm } from "@/components/admin/account-edit-form";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .single();

  if (!account) notFound();

  const { data: members } = await supabase
    .from("account_memberships")
    .select("*, profiles(id, email, full_name)")
    .eq("account_id", id)
    .order("created_at");

  const { data: contacts } = await supabase
    .from("account_contacts")
    .select("*")
    .eq("account_id", id)
    .order("created_at");

  const { data: events } = await supabase
    .from("events")
    .select("id, name, status, start_date")
    .eq("owner_account_id", id)
    .order("start_date", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/accounts"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Accounts
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{account.name}</h1>
        </div>
        <StatusBadge status={account.status} />
      </div>

      {/* Account Details */}
      <AccountEditForm account={account} />

      {/* Members */}
      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Members</h2>
          <Link
            href={`/admin/accounts/${id}/members`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Manage Members
          </Link>
        </div>
        {members && members.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">
                  Email
                </th>
                <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">
                  Name
                </th>
                <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">
                  Role
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="py-2 text-sm">
                    {(m.profiles as unknown as { email: string })?.email}
                  </td>
                  <td className="py-2 text-sm text-gray-500">
                    {(m.profiles as unknown as { full_name: string })?.full_name || "—"}
                  </td>
                  <td className="py-2">
                    <StatusBadge status={m.account_role} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">No members yet.</p>
        )}
      </section>

      {/* Contacts */}
      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contacts</h2>
          <Link
            href={`/admin/accounts/${id}/contacts`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Manage Contacts
          </Link>
        </div>
        {contacts && contacts.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">
                  Name
                </th>
                <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">
                  Email
                </th>
                <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">
                  Phone
                </th>
                <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">
                  Role
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 text-sm">{c.name}</td>
                  <td className="py-2 text-sm text-gray-500">{c.email || "—"}</td>
                  <td className="py-2 text-sm text-gray-500">{c.phone || "—"}</td>
                  <td className="py-2 text-sm text-gray-500">{c.role_label || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">No contacts yet.</p>
        )}
      </section>

      {/* Events owned by this account */}
      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Owned Events</h2>
        </div>
        {events && events.length > 0 ? (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between">
                <Link
                  href={`/admin/events/${e.id}`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {e.name}
                </Link>
                <div className="flex items-center gap-2">
                  {e.start_date && (
                    <span className="text-xs text-gray-400">
                      {new Date(e.start_date).toLocaleDateString()}
                    </span>
                  )}
                  <StatusBadge status={e.status} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No events yet.</p>
        )}
      </section>
    </div>
  );
}
