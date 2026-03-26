"use client";

import { useState } from "react";
import { updateEvent } from "@/lib/actions/events";
import { FormButton } from "@/components/ui/form-button";

type Event = {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  notes: string | null;
};

export function EventEditForm({ event }: { event: Event }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSuccess(false);
    const result = await updateEvent(event.id, formData);
    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
      setSuccess(true);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Event Details</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">Name</label>
          <input id="name" name="name" type="text" defaultValue={event.name} required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium">Status</label>
          <select id="status" name="status" defaultValue={event.status} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="finalized">Finalized</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_date" className="mb-1 block text-sm font-medium">Start Date</label>
          <input id="start_date" name="start_date" type="date" defaultValue={event.start_date || ""} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="end_date" className="mb-1 block text-sm font-medium">End Date</label>
          <input id="end_date" name="end_date" type="date" defaultValue={event.end_date || ""} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">Description</label>
        <textarea id="description" name="description" defaultValue={event.description || ""} rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">Internal Notes</label>
        <textarea id="notes" name="notes" defaultValue={event.notes || ""} rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">Event updated.</div>}

      <FormButton>Save Changes</FormButton>
    </form>
  );
}
