"use client";

import { useState } from "react";
import { updateEventContactRoleLabel } from "@/lib/actions/events";
import { removeContactFromEvent } from "@/lib/actions/contacts";
import { InlineEditField } from "./inline-edit-field";

export function EditableContactItem({
  assignment,
  eventId,
  canManage,
}: {
  assignment: {
    id: string;
    role_label: string | null;
    visibility: string;
    contact: {
      name: string;
      email: string | null;
      phone: string | null;
      role_label: string | null;
      accountName: string;
    };
  };
  eventId: string;
  canManage: boolean;
}) {
  const [removing, setRemoving] = useState(false);
  const [removed, setRemoved] = useState(false);

  async function handleRemove() {
    if (!confirm(`Remove ${assignment.contact.name} from this event?`)) return;
    setRemoving(true);
    const result = await removeContactFromEvent(eventId, assignment.id);
    if (result.error) {
      alert(result.error);
      setRemoving(false);
    } else {
      setRemoved(true);
    }
  }

  if (removed) return null;

  return (
    <div className="p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {assignment.contact.name}
          </p>
          <div className="mt-0.5">
            {canManage ? (
              <InlineEditField
                value={assignment.role_label || ""}
                placeholder="Add event role..."
                onSave={async (newValue) => {
                  return await updateEventContactRoleLabel(
                    assignment.id,
                    eventId,
                    newValue
                  );
                }}
              />
            ) : (
              <p className="text-xs text-gray-500">
                {assignment.role_label && (
                  <span className="font-medium text-gray-600">
                    {assignment.role_label}
                  </span>
                )}
                {assignment.role_label && assignment.contact.accountName && " · "}
                {assignment.contact.accountName}
              </p>
            )}
          </div>
          {!canManage && (
            <p className="text-xs text-gray-400">
              {assignment.contact.accountName}
            </p>
          )}
          {canManage && (
            <p className="mt-0.5 text-xs text-gray-400">
              {assignment.contact.accountName}
              {assignment.visibility === "owner_only" && (
                <span className="ml-1.5 text-amber-500">Owner only</span>
              )}
            </p>
          )}
        </div>
        <div className="ml-4 flex items-start gap-3">
          <div className="text-right text-xs text-gray-400">
            {assignment.contact.email && <p>{assignment.contact.email}</p>}
            {assignment.contact.phone && <p>{assignment.contact.phone}</p>}
          </div>
          {canManage && (
            <button
              onClick={handleRemove}
              disabled={removing}
              className="shrink-0 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
            >
              {removing ? "..." : "Remove"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
