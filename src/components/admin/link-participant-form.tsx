"use client";

import { useState } from "react";
import { linkParticipantAccount } from "@/lib/actions/events";
import { FormButton } from "@/components/ui/form-button";

type Account = { id: string; name: string; type: string };

export function LinkParticipantForm({
  eventId,
  accounts,
}: {
  eventId: string;
  accounts: Account[];
}) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await linkParticipantAccount(formData);
    if (result.error) setError(result.error);
    else setError(null);
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Link Participant Account</h2>
      <input type="hidden" name="event_id" value={eventId} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="account_id" className="mb-1 block text-sm font-medium">Account</label>
          <select id="account_id" name="account_id" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Select account...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="role_label" className="mb-1 block text-sm font-medium">Role Label</label>
          <input id="role_label" name="role_label" type="text" placeholder="e.g. Sound Vendor" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <FormButton>Link Account</FormButton>
    </form>
  );
}
