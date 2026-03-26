"use client";

import Link from "next/link";
import { unlinkParticipantAccount } from "@/lib/actions/events";

type ParticipantRowProps = {
  eventId: string;
  accountId: string;
  account: { id: string; name: string; type: string };
  roleLabel: string | null;
};

export function ParticipantRow({ eventId, accountId, account, roleLabel }: ParticipantRowProps) {
  async function handleUnlink() {
    if (confirm(`Remove "${account.name}" from this event?`)) {
      await unlinkParticipantAccount(eventId, accountId);
    }
  }

  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <Link href={`/admin/accounts/${account.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
          {account.name}
        </Link>
        <p className="text-xs text-gray-500">
          {account.type}{roleLabel ? ` — ${roleLabel}` : ""}
        </p>
      </div>
      <button onClick={handleUnlink} className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
        Unlink
      </button>
    </div>
  );
}
