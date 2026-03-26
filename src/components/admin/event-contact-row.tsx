"use client";

import { removeContactFromEvent } from "@/lib/actions/contacts";

type EventContactRowProps = {
  assignmentId: string;
  eventId: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  accountName: string;
  roleLabel: string | null;
  visibility: string;
};

export function EventContactRow({
  assignmentId,
  eventId,
  contactName,
  contactEmail,
  contactPhone,
  accountName,
  roleLabel,
  visibility,
}: EventContactRowProps) {
  async function handleRemove() {
    if (confirm(`Remove "${contactName}" from this event?`)) {
      await removeContactFromEvent(eventId, assignmentId);
    }
  }

  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <p className="text-sm font-medium">
          {contactName}
          {roleLabel && (
            <span className="ml-2 text-gray-500">— {roleLabel}</span>
          )}
        </p>
        <p className="text-xs text-gray-500">
          {accountName} |{" "}
          {[contactEmail, contactPhone].filter(Boolean).join(" | ") ||
            "No contact info"}{" "}
          |{" "}
          <span className="text-gray-400">
            {visibility === "all_participants"
              ? "Visible to all"
              : "Owner only"}
          </span>
        </p>
      </div>
      <button
        onClick={handleRemove}
        className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
      >
        Remove
      </button>
    </div>
  );
}
