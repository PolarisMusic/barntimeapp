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
  timezone: string | null;
  is_public: boolean | null;
  public_slug: string | null;
  public_summary: string | null;
  hero_image_url: string | null;
  ticketing_enabled: boolean | null;
  ticket_price_cents: number | null;
  ticket_capacity: number | null;
  address_reveal_at: string | null;
  public_address: string | null;
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

  const priceDollars =
    event.ticket_price_cents != null
      ? (event.ticket_price_cents / 100).toFixed(2)
      : "";

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
        <label htmlFor="timezone" className="mb-1 block text-sm font-medium">Timezone</label>
        <input id="timezone" name="timezone" type="text" defaultValue={event.timezone || "America/Los_Angeles"} placeholder="e.g. America/New_York" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">Description</label>
        <textarea id="description" name="description" defaultValue={event.description || ""} rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">Internal Notes</label>
        <textarea id="notes" name="notes" defaultValue={event.notes || ""} rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <fieldset className="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4">
        <legend className="px-1 text-sm font-semibold text-gray-700">
          Public listing &amp; ticketing
        </legend>

        <div className="flex items-center gap-2">
          <input
            id="is_public"
            name="is_public"
            type="checkbox"
            defaultChecked={!!event.is_public}
          />
          <label htmlFor="is_public" className="text-sm">
            List this event publicly
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="public_slug" className="mb-1 block text-sm font-medium">
              URL slug
            </label>
            <input
              id="public_slug"
              name="public_slug"
              type="text"
              defaultValue={event.public_slug || ""}
              placeholder="summer-barn-show"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="hero_image_url" className="mb-1 block text-sm font-medium">
              Hero image URL
            </label>
            <input
              id="hero_image_url"
              name="hero_image_url"
              type="url"
              defaultValue={event.hero_image_url || ""}
              placeholder="https://..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="public_summary" className="mb-1 block text-sm font-medium">
            Public summary
          </label>
          <textarea
            id="public_summary"
            name="public_summary"
            rows={3}
            defaultValue={event.public_summary || ""}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="ticketing_enabled"
            name="ticketing_enabled"
            type="checkbox"
            defaultChecked={!!event.ticketing_enabled}
          />
          <label htmlFor="ticketing_enabled" className="text-sm">
            Sell tickets
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="ticket_price_dollars"
              className="mb-1 block text-sm font-medium"
            >
              Ticket price (USD)
            </label>
            <input
              id="ticket_price_dollars"
              name="ticket_price_dollars"
              type="number"
              min="0"
              step="0.01"
              defaultValue={priceDollars}
              placeholder="15.00"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="ticket_capacity"
              className="mb-1 block text-sm font-medium"
            >
              Capacity
            </label>
            <input
              id="ticket_capacity"
              name="ticket_capacity"
              type="number"
              min="0"
              step="1"
              defaultValue={event.ticket_capacity ?? ""}
              placeholder="50"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="address_reveal_at"
            className="mb-1 block text-sm font-medium"
          >
            Address reveal time
          </label>
          <input
            id="address_reveal_at"
            name="address_reveal_at"
            type="datetime-local"
            defaultValue={toDatetimeLocal(event.address_reveal_at)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Ticket holders see the address after this time.
          </p>
        </div>

        <div>
          <label htmlFor="public_address" className="mb-1 block text-sm font-medium">
            Public address (revealed)
          </label>
          <input
            id="public_address"
            name="public_address"
            type="text"
            defaultValue={event.public_address || ""}
            placeholder="123 Barn Rd, Petaluma, CA"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </fieldset>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">Event updated.</div>}

      <FormButton>Save Changes</FormButton>
    </form>
  );
}
