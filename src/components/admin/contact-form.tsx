"use client";

import { useState } from "react";
import { createContact } from "@/lib/actions/contacts";
import { FormButton } from "@/components/ui/form-button";

export function ContactForm({ accountId }: { accountId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSuccess(false);
    const result = await createContact(formData);
    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
      setSuccess(true);
    }
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
    >
      <h2 className="text-lg font-semibold">Add Contact</h2>
      <input type="hidden" name="account_id" value={accountId} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">Name</label>
          <input id="name" name="name" type="text" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="role_label" className="mb-1 block text-sm font-medium">Role</label>
          <input id="role_label" name="role_label" type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. Stage Manager" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
          <input id="email" name="email" type="email" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium">Phone</label>
          <input id="phone" name="phone" type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">Notes</label>
        <textarea id="notes" name="notes" rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">Contact added.</div>}

      <FormButton>Add Contact</FormButton>
    </form>
  );
}
