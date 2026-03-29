"use client";

import { useState } from "react";
import { assignContactToEvent } from "@/lib/actions/contacts";
import { FormButton } from "@/components/ui/form-button";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  role_label: string | null;
  accounts: { name: string } | null;
};

export function AssignContactForm({
  eventId,
  contacts,
}: {
  eventId: string;
  contacts: Contact[];
}) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await assignContactToEvent(formData);
    if (result.error) setError(result.error);
    else setError(null);
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6"
    >
      <h2 className="text-lg font-semibold">Assign Contact to Event</h2>
      <input type="hidden" name="event_id" value={eventId} />

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="contact_id"
            className="mb-1 block text-sm font-medium"
          >
            Contact
          </label>
          <select
            id="contact_id"
            name="contact_id"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select contact...</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.accounts ? ` (${(c.accounts as { name: string }).name})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="role_label"
            className="mb-1 block text-sm font-medium"
          >
            Event Role
          </label>
          <input
            id="role_label"
            name="role_label"
            type="text"
            placeholder="e.g. Day-of Coordinator"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="visibility"
            className="mb-1 block text-sm font-medium"
          >
            Visibility
          </label>
          <select
            id="visibility"
            name="visibility"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all_participants">All Participants</option>
            <option value="owner_only">Owner Only</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <FormButton>Assign Contact</FormButton>
    </form>
  );
}
