"use client";

import { useState } from "react";
import { inviteMemberToAccount } from "@/lib/actions/accounts";
import { FormButton } from "@/components/ui/form-button";

export function InviteMemberForm({ accountId }: { accountId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSuccess(false);
    setError(null);
    const result = await inviteMemberToAccount(formData);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
    >
      <h2 className="text-lg font-semibold">Invite Member</h2>
      <input type="hidden" name="account_id" value={accountId} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="account_role"
            className="mb-1 block text-sm font-medium"
          >
            Role
          </label>
          <select
            id="account_role"
            name="account_role"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="viewer">Viewer</option>
            <option value="event_coordinator">Event Coordinator</option>
            <option value="account_manager">Account Manager</option>
            <option value="account_owner">Account Owner</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Member invited successfully.
        </div>
      )}

      <FormButton>Send Invite</FormButton>
    </form>
  );
}
