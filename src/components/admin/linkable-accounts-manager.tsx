"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addLinkableAccount, removeLinkableAccount } from "@/lib/actions/linkable-accounts";

type Account = { id: string; name: string; type: string };

export function LinkableAccountsManager({
  ownerAccountId,
  allowlist,
  allAccounts,
}: {
  ownerAccountId: string;
  allowlist: Account[];
  allAccounts: Account[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowlistIds = new Set(allowlist.map((a) => a.id));
  const available = allAccounts.filter((a) => !allowlistIds.has(a.id));

  async function handleAdd() {
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);
    const result = await addLinkableAccount(ownerAccountId, selectedId);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSelectedId("");
      router.refresh();
    }
  }

  async function handleRemove(accountId: string) {
    setError(null);
    const result = await removeLinkableAccount(ownerAccountId, accountId);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      {allowlist.length > 0 ? (
        <table className="mb-4 min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">
                Account
              </th>
              <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">
                Type
              </th>
              <th className="pb-2 text-right text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allowlist.map((a) => (
              <tr key={a.id}>
                <td className="py-2 text-sm">{a.name}</td>
                <td className="py-2 text-sm text-gray-500">{a.type}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleRemove(a.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mb-4 text-sm text-gray-500">
          No accounts in the allowlist yet. Events owned by this account will show an
          empty participant picker until accounts are added here.
        </p>
      )}

      {available.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select account to add...</option>
            {available.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={submitting || !selectedId}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add"}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
