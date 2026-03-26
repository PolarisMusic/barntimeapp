import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function AccountsPage() {
  await requireAdmin();
  const supabase = await createServiceClient();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("*, account_memberships(count)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <Link
          href="/admin/accounts/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Account
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Members
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {accounts?.map((account) => (
              <tr key={account.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/accounts/${account.id}`}
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    {account.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {account.type}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={account.status} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {(account.account_memberships as unknown as { count: number }[])?.[0]?.count ?? 0}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(account.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {(!accounts || accounts.length === 0) && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  No accounts yet.{" "}
                  <Link
                    href="/admin/accounts/new"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Create one
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
