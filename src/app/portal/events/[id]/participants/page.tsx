import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { PortalParticipantList } from "@/components/portal/participant-list";

export default async function PortalParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireProfile();
  const { id } = await params;
  const supabase = await createClient();

  const { data: summaryRows } = await supabase.rpc("event_summary", {
    p_event_id: id,
  });
  const summary = summaryRows?.[0];
  if (!summary) notFound();

  // Route guard: only users with manage_participants can access
  if (!summary.can_manage_participants) {
    redirect(`/portal/events/${id}`);
  }

  const { data: participants } = await supabase
    .from("event_accounts")
    .select("*, accounts(id, name, type)")
    .eq("event_id", id);

  // Get available accounts (active, not the owner, not already linked)
  const { data: allAccounts } = await supabase
    .from("accounts")
    .select("id, name, type")
    .eq("status", "active")
    .neq("id", summary.owner_account_id)
    .order("name");

  const linkedIds = new Set(participants?.map((p) => p.account_id) ?? []);
  const availableAccounts = (allAccounts || []).filter((a) => !linkedIds.has(a.id));

  const participantItems = (participants || []).map((p) => ({
    accountId: p.account_id,
    accountName: (p.accounts as unknown as { name: string })?.name || "Unknown",
    accountType: (p.accounts as unknown as { type: string })?.type || "",
    roleLabel: p.role_label,
    visibility: p.visibility,
  }));

  return (
    <div className="space-y-4">
      <PortalParticipantList
        eventId={id}
        participants={participantItems}
        availableAccounts={availableAccounts}
      />
    </div>
  );
}
