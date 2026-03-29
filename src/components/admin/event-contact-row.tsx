"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeContactFromEvent } from "@/lib/actions/contacts";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";

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
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleRemove() {
    const result = await removeContactFromEvent(eventId, assignmentId);
    if (result?.error) {
      toast(result.error, "error");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex items-center justify-between p-4">
      <ConfirmDialog
        open={confirmOpen}
        title="Remove Contact"
        message={`Remove "${contactName}" from this event?`}
        confirmLabel="Remove"
        onConfirm={async () => { await handleRemove(); setConfirmOpen(false); }}
        onCancel={() => setConfirmOpen(false)}
      />
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
        onClick={() => setConfirmOpen(true)}
        className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
      >
        Remove
      </button>
    </div>
  );
}
