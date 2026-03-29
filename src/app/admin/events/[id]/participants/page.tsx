import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { LinkParticipantForm } from "@/components/admin/link-participant-form";
import { ParticipantRow } from "@/components/admin/participant-row";

export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, owner_account_id")
    .eq("id", id)
    .single();

  if (!event) notFound();

  const { data: participants } = await supabase
    .from("event_accounts")
    .select("*, accounts(id, name, type)")
    .eq("event_id", id);

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, type")
    .eq("status", "active")
    .neq("id", event.owner_account_id)
    .order("name");

  // Filter out already-linked accounts
  const linkedIds = new Set(participants?.map((p) => p.account_id) ?? []);
  const availableAccounts = accounts?.filter((a) => !linkedIds.has(a.id)) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/events/${id}`} className="text-sm text-gray-500 hover:text-gray-700">&larr; {event.name}</Link>
        <h1 className="mt-1 text-2xl font-bold">Participants</h1>
      </div>

      <LinkParticipantForm eventId={id} accounts={availableAccounts} />

      <div className="rounded-lg border border-gray-200 bg-white">
        {participants && participants.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {participants.map((p) => (
              <ParticipantRow
                key={p.id}
                eventId={id}
                accountId={p.account_id}
                account={p.accounts as unknown as { id: string; name: string; type: string }}
                roleLabel={p.role_label}
                visibility={p.visibility}
              />
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">No participant accounts linked yet.</p>
        )}
      </div>
    </div>
  );
}
