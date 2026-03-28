"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEventContactRoleLabel } from "@/lib/actions/events";
import { removeContactFromEvent, updateContactVisibility } from "@/lib/actions/contacts";
import { InlineEditField } from "./inline-edit-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";

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
  const router = useRouter();
  const { toast } = useToast();
  const [removing, setRemoving] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [visUpdating, setVisUpdating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    const result = await removeContactFromEvent(eventId, assignment.id);
    if (result.error) {
      toast(result.error, "error");
      setRemoving(false);
    } else {
      setRemoved(true);
      router.refresh();
    }
  }

  async function handleVisibilityChange(newVisibility: string) {
    setVisUpdating(true);
    const result = await updateContactVisibility(assignment.id, eventId, newVisibility);
    setVisUpdating(false);
    if (result.error) {
      toast(result.error, "error");
    } else {
      router.refresh();
    }
  }

  if (removed) return null;

  return (
    <div className="p-4">
      <ConfirmDialog
        open={confirmOpen}
        title="Remove Contact"
        message={`Remove ${assignment.contact.name} from this event?`}
        confirmLabel="Remove"
        onConfirm={() => {
          setConfirmOpen(false);
          handleRemove();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
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
          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
            <span>{assignment.contact.accountName}</span>
            {canManage ? (
              <select
                value={assignment.visibility}
                onChange={(e) => handleVisibilityChange(e.target.value)}
                disabled={visUpdating}
                className="rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-500 disabled:opacity-50"
              >
                <option value="owner_only">Owner only</option>
                <option value="all_participants">All participants</option>
              </select>
            ) : (
              assignment.visibility === "owner_only" && (
                <span className="text-amber-500">Owner only</span>
              )
            )}
          </div>
        </div>
        <div className="ml-4 flex items-start gap-3">
          <div className="text-right text-xs text-gray-400">
            {assignment.contact.email && <p>{assignment.contact.email}</p>}
            {assignment.contact.phone && <p>{assignment.contact.phone}</p>}
          </div>
          {canManage && (
            <button
              onClick={() => setConfirmOpen(true)}
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
