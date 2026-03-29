"use client";

import { useState } from "react";
import { createService } from "@/lib/actions/events";
import { FormButton } from "@/components/ui/form-button";

type Account = { id: string; name: string };

export function ServiceForm({ eventId, accounts }: { eventId: string; accounts: Account[] }) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await createService(formData);
    if (result.error) setError(result.error);
    else setError(null);
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Add Service</h2>
      <input type="hidden" name="event_id" value={eventId} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">Service Name</label>
          <input id="name" name="name" type="text" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="account_id" className="mb-1 block text-sm font-medium">Vendor Account</label>
          <select id="account_id" name="account_id" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">None</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">Description</label>
        <textarea id="description" name="description" rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <FormButton>Add Service</FormButton>
    </form>
  );
}
