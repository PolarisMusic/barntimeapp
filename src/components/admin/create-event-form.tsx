"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "@/lib/actions/events";
import { FormButton } from "@/components/ui/form-button";

type Account = { id: string; name: string; type: string };

export function CreateEventForm({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await createEvent(formData);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      router.push(`/admin/events/${result.data.id}`);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <div>
        <label htmlFor="owner_account_id" className="mb-1 block text-sm font-medium">Owner Account</label>
        <select id="owner_account_id" name="owner_account_id" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Select account...</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">Event Name</label>
        <input id="name" name="name" type="text" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_date" className="mb-1 block text-sm font-medium">Start Date</label>
          <input id="start_date" name="start_date" type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="end_date" className="mb-1 block text-sm font-medium">End Date</label>
          <input id="end_date" name="end_date" type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">Description</label>
        <textarea id="description" name="description" rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <FormButton>Create Event</FormButton>
    </form>
  );
}
