"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createAccount } from "@/lib/actions/accounts";
import { FormButton } from "@/components/ui/form-button";

export default function NewAccountPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await createAccount(formData);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      router.push(`/admin/accounts/${result.data.id}`);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">New Account</h1>

      <form action={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Account Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="type" className="mb-1 block text-sm font-medium">
            Account Type
          </label>
          <select
            id="type"
            name="type"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="client">Client</option>
            <option value="vendor">Vendor</option>
            <option value="venue">Venue</option>
            <option value="performer">Performer</option>
            <option value="internal">Internal</option>
          </select>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <FormButton>Create Account</FormButton>
      </form>
    </div>
  );
}
