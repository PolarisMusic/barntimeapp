"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignContactToEvent } from "@/lib/actions/contacts";

export function ContactAssignForm({
  eventId,
  availableContacts,
}: {
  eventId: string;
  availableContacts: { id: string; name: string; role_label: string | null; accountName?: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [visibility, setVisibility] = useState("owner_only");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedContactId) return;

    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.set("event_id", eventId);
    fd.set("contact_id", selectedContactId);
    fd.set("role_label", roleLabel);
    fd.set("visibility", visibility);

    const result = await assignContactToEvent(fd);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSelectedContactId("");
      setRoleLabel("");
      setVisibility("owner_only");
      setOpen(false);
      router.refresh();
    }
  }

  if (availableContacts.length === 0 && !open) {
    return (
      <p className="px-4 py-3 text-xs text-gray-400">
        All contacts from linked account directories are already assigned.
      </p>
    );
  }

  if (!open) {
    return (
      <div className="px-4 py-3">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          Assign Contact
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 px-4 py-4">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Contact
          </label>
          <select
            value={selectedContactId}
            onChange={(e) => setSelectedContactId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a contact...</option>
            {availableContacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.role_label ? ` — ${c.role_label}` : ""}
                {c.accountName ? ` [${c.accountName}]` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Event Role (optional)
          </label>
          <input
            type="text"
            value={roleLabel}
            onChange={(e) => setRoleLabel(e.target.value)}
            placeholder="e.g. Stage Manager, Sound Engineer"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Visibility
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="owner_only">Owner only</option>
            <option value="all_participants">All participants</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting || !selectedContactId}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Assigning..." : "Assign"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>
    </form>
  );
}
