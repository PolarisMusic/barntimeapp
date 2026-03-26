"use client";

import { useState } from "react";
import { updateAccount } from "@/lib/actions/accounts";
import { FormButton } from "@/components/ui/form-button";

type Account = {
  id: string;
  name: string;
  type: string;
  status: string;
  notes: string | null;
};

export function AccountEditForm({ account }: { account: Account }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSuccess(false);
    const result = await updateAccount(account.id, formData);
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
      <h2 className="text-lg font-semibold">Account Details</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={account.name}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="type" className="mb-1 block text-sm font-medium">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={account.type}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="client">Client</option>
            <option value="vendor">Vendor</option>
            <option value="venue">Venue</option>
            <option value="internal">Internal</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="status" className="mb-1 block text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={account.status}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={account.notes || ""}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Account updated.
        </div>
      )}

      <FormButton>Save Changes</FormButton>
    </form>
  );
}
