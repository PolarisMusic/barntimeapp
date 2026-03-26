"use client";

import { useState } from "react";
import { createScheduleItem } from "@/lib/actions/events";
import { FormButton } from "@/components/ui/form-button";

type Location = { id: string; name: string };

export function ScheduleItemForm({ eventId, locations }: { eventId: string; locations: Location[] }) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await createScheduleItem(formData);
    if (result.error) setError(result.error);
    else setError(null);
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Add Schedule Item</h2>
      <input type="hidden" name="event_id" value={eventId} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium">Title</label>
          <input id="title" name="title" type="text" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="location_id" className="mb-1 block text-sm font-medium">Location</label>
          <select id="location_id" name="location_id" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">None</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_time" className="mb-1 block text-sm font-medium">Start Time</label>
          <input id="start_time" name="start_time" type="datetime-local" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="end_time" className="mb-1 block text-sm font-medium">End Time</label>
          <input id="end_time" name="end_time" type="datetime-local" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">Description</label>
        <textarea id="description" name="description" rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <FormButton>Add Item</FormButton>
    </form>
  );
}
