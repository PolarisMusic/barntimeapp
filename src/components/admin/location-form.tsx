"use client";

import { useState } from "react";
import { createLocation } from "@/lib/actions/events";
import { FormButton } from "@/components/ui/form-button";

export function LocationForm({ eventId }: { eventId: string }) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await createLocation(formData);
    if (result.error) setError(result.error);
    else setError(null);
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Add Location</h2>
      <input type="hidden" name="event_id" value={eventId} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">Name</label>
          <input id="name" name="name" type="text" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-medium">Address</label>
          <input id="address" name="address" type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="location_type" className="mb-1 block text-sm font-medium">Location Type</label>
          <select id="location_type" name="location_type" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">— Select —</option>
            <option value="ceremony">Ceremony</option>
            <option value="reception">Reception</option>
            <option value="lodging">Lodging</option>
            <option value="rehearsal">Rehearsal</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="map_url" className="mb-1 block text-sm font-medium">Map URL</label>
          <input id="map_url" name="map_url" type="url" placeholder="https://maps.google.com/..." className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">Notes</label>
        <textarea id="notes" name="notes" rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <FormButton>Add Location</FormButton>
    </form>
  );
}
