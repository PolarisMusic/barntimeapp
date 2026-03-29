"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  linkParticipantAccount,
  unlinkParticipantAccount,
  updateParticipant,
} from "@/lib/actions/events";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";

// Top-level wrapper so the add form can access toast
function ParticipantAddForm({
  eventId,
  availableAccounts,
}: {
  eventId: string;
  availableAccounts: Account[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [addAccountId, setAddAccountId] = useState("");
  const [addRoleLabel, setAddRoleLabel] = useState("");
  const [addVisibility, setAddVisibility] = useState("limited");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addAccountId) return;
    setSubmitting(true);
    setError(null);
    const fd = new FormData();
    fd.set("event_id", eventId);
    fd.set("account_id", addAccountId);
    fd.set("role_label", addRoleLabel);
    fd.set("visibility", addVisibility);
    const result = await linkParticipantAccount(fd);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      const name = availableAccounts.find((a) => a.id === addAccountId)?.name;
      toast(name ? `Added ${name} as participant` : "Participant added", "success");
      setShowAdd(false);
      setAddAccountId("");
      setAddRoleLabel("");
      setAddVisibility("limited");
      router.refresh();
    }
  }

  if (!showAdd) {
    return availableAccounts.length > 0 ? (
      <div className="px-4 py-3">
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          Add Participant
        </button>
      </div>
    ) : null;
  }

  return (
    <form onSubmit={handleAdd} className="border-t border-gray-200 px-4 py-4">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
          <select
            value={addAccountId}
            onChange={(e) => setAddAccountId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select account...</option>
            {availableAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role Label</label>
            <input
              type="text"
              value={addRoleLabel}
              onChange={(e) => setAddRoleLabel(e.target.value)}
              placeholder="e.g. Sound Vendor"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Visibility</label>
            <select
              value={addVisibility}
              onChange={(e) => setAddVisibility(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="limited">Limited</option>
              <option value="standard">Standard</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting || !addAccountId}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add Participant"}
          </button>
          <button
            type="button"
            onClick={() => { setShowAdd(false); setError(null); }}
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

type Participant = {
  accountId: string;
  accountName: string;
  accountType: string;
  roleLabel: string | null;
  visibility: string;
};

type Account = { id: string; name: string; type: string };

export function PortalParticipantList({
  eventId,
  participants,
  availableAccounts,
}: {
  eventId: string;
  participants: Participant[];
  availableAccounts: Account[];
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {participants.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {participants.map((p) => (
            <ParticipantItem
              key={p.accountId}
              eventId={eventId}
              participant={p}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500">
            {availableAccounts.length > 0
              ? "No participant accounts linked yet. Use the button below to add participants."
              : "No approved participant accounts are available for this event yet."}
          </p>
        </div>
      )}

      <ParticipantAddForm eventId={eventId} availableAccounts={availableAccounts} />
    </div>
  );
}

function ParticipantItem({
  eventId,
  participant,
}: {
  eventId: string;
  participant: Participant;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleUnlink(): Promise<boolean> {
    setUpdating(true);
    setError(null);
    const result = await unlinkParticipantAccount(eventId, participant.accountId);
    if (result.error) {
      setError(result.error);
      setUpdating(false);
      return false;
    } else {
      toast(`Removed ${participant.accountName}`, "success");
      setRemoved(true);
      router.refresh();
      return true;
    }
  }

  async function handleVisibilityChange(newVis: string) {
    setUpdating(true);
    setError(null);
    const result = await updateParticipant(eventId, participant.accountId, { visibility: newVis });
    setUpdating(false);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast(`Updated ${participant.accountName} visibility`, "success");
      router.refresh();
    }
  }

  async function handleRoleLabelBlur(e: React.FocusEvent<HTMLInputElement>) {
    const newLabel = e.target.value;
    if (newLabel !== (participant.roleLabel || "")) {
      setUpdating(true);
      setError(null);
      const result = await updateParticipant(eventId, participant.accountId, { role_label: newLabel });
      setUpdating(false);
      if (result.error) {
        toast(result.error, "error");
      } else {
        toast(`Updated ${participant.accountName} role`, "success");
        router.refresh();
      }
    }
  }

  if (removed) return null;

  return (
    <div className="p-4">
      <ConfirmDialog
        open={confirmOpen}
        title="Remove Participant"
        message={`Remove "${participant.accountName}" from this event?`}
        confirmLabel="Remove"
        onConfirm={async () => {
          const ok = await handleUnlink();
          if (ok) setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm font-medium">{participant.accountName}</p>
            <p className="text-xs text-gray-500">{participant.accountType}</p>
          </div>
          <input
            key={participant.roleLabel ?? ""}
            type="text"
            defaultValue={participant.roleLabel || ""}
            placeholder="Role label"
            onBlur={handleRoleLabelBlur}
            disabled={updating}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs disabled:opacity-50"
          />
          <select
            value={participant.visibility}
            onChange={(e) => handleVisibilityChange(e.target.value)}
            disabled={updating}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs disabled:opacity-50"
          >
            <option value="limited">Limited</option>
            <option value="standard">Standard</option>
          </select>
        </div>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={updating}
          className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
        >
          Remove
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
