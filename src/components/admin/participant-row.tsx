"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { unlinkParticipantAccount, updateParticipant } from "@/lib/actions/events";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";

type ParticipantRowProps = {
  eventId: string;
  accountId: string;
  account: { id: string; name: string; type: string };
  roleLabel: string | null;
  visibility: string;
};

export function ParticipantRow({ eventId, accountId, account, roleLabel, visibility }: ParticipantRowProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleUnlink(): Promise<boolean> {
    const result = await unlinkParticipantAccount(eventId, accountId);
    if (result?.error) {
      toast(result.error, "error");
      return false;
    } else {
      toast("Participant removed", "success");
      router.refresh();
      return true;
    }
  }

  async function handleVisibilityChange(newVisibility: string) {
    setUpdating(true);
    const result = await updateParticipant(eventId, accountId, { visibility: newVisibility });
    setUpdating(false);
    if (result?.error) {
      toast(result.error, "error");
    } else {
      router.refresh();
    }
  }

  async function handleRoleLabelBlur(e: React.FocusEvent<HTMLInputElement>) {
    const newLabel = e.target.value;
    if (newLabel !== (roleLabel || "")) {
      setUpdating(true);
      const result = await updateParticipant(eventId, accountId, { role_label: newLabel });
      setUpdating(false);
      if (result?.error) {
        toast(result.error, "error");
      } else {
        router.refresh();
      }
    }
  }

  return (
    <div className="flex items-center justify-between p-4">
      <ConfirmDialog
        open={confirmOpen}
        title="Remove Participant"
        message={`Remove "${account.name}" from this event?`}
        confirmLabel="Remove"
        onConfirm={async () => { const ok = await handleUnlink(); if (ok) setConfirmOpen(false); }}
        onCancel={() => setConfirmOpen(false)}
      />
      <div className="flex items-center gap-4">
        <div>
          <Link href={`/admin/accounts/${account.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
            {account.name}
          </Link>
          <p className="text-xs text-gray-500">{account.type}</p>
        </div>
        <input
          key={roleLabel ?? ""}
          type="text"
          defaultValue={roleLabel || ""}
          placeholder="Role label"
          onBlur={handleRoleLabelBlur}
          disabled={updating}
          className="rounded-md border border-gray-200 px-2 py-1 text-xs disabled:opacity-50"
        />
        <select
          value={visibility}
          onChange={(e) => handleVisibilityChange(e.target.value)}
          disabled={updating}
          className="rounded-md border border-gray-200 px-2 py-1 text-xs disabled:opacity-50"
        >
          <option value="limited">Limited</option>
          <option value="standard">Standard</option>
        </select>
      </div>
      <button onClick={() => setConfirmOpen(true)} className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
        Unlink
      </button>
    </div>
  );
}
