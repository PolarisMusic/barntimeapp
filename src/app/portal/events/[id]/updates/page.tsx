import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

const actionLabels: Record<string, string> = {
  "event.created": "Event created",
  "event.updated": "Event updated",
  "participant.linked": "Participant added",
  "participant.unlinked": "Participant removed",
  "participant.updated": "Participant updated",
  "service.created": "Service added",
  "service.updated": "Service updated",
  "service.deleted": "Service removed",
  "service.notes_updated": "Service notes updated",
  "vendor.confirmed": "Vendor confirmed",
  "schedule.item_created": "Schedule item added",
  "schedule.item_updated": "Schedule item updated",
  "schedule.item_deleted": "Schedule item removed",
  "schedule.notes_updated": "Schedule notes updated",
  "location.created": "Location added",
  "location.updated": "Location updated",
  "location.deleted": "Location removed",
  "document.uploaded": "Document uploaded",
  "document.updated": "Document updated",
  "document.deleted": "Document removed",
  "contact.assigned": "Contact assigned",
  "contact.unassigned": "Contact removed",
  "contact.role_updated": "Contact role updated",
};

// Actions visible to everyone who can view the event
const universalActions = new Set([
  "event.created",
  "event.updated",
]);

// Actions visible to owner-account members only
const ownerActions = new Set([
  "participant.linked",
  "participant.unlinked",
  "participant.updated",
  "document.uploaded",
  "document.updated",
  "document.deleted",
  "contact.assigned",
  "contact.unassigned",
  "contact.role_updated",
  "service.created",
  "service.updated",
  "service.deleted",
  "service.notes_updated",
  "vendor.confirmed",
  "schedule.item_created",
  "schedule.item_updated",
  "schedule.item_deleted",
  "schedule.notes_updated",
  "location.created",
  "location.updated",
  "location.deleted",
]);

// Actions visible to standard (non-limited) participants
const standardParticipantActions = new Set([
  "service.created",
  "service.updated",
  "service.deleted",
  "service.notes_updated",
  "vendor.confirmed",
  "schedule.item_created",
  "schedule.item_updated",
  "schedule.item_deleted",
  "schedule.notes_updated",
  "location.created",
  "location.updated",
  "location.deleted",
]);

// Actions visible to limited participants (only event-level changes)
// Limited participants see: universalActions only
// (They can't see schedule, locations, most services, owner-only docs/contacts)

function timeAgo(date: string) {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default async function UpdatesPage({
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

  const isOwner = summary.is_owner === true;
  const isLimited =
    !isOwner && summary.participant_visibility_level === "limited";
  const isStandard = !isOwner && !isLimited;

  // Fetch recent activity for this event
  const { data: activities } = await supabase
    .from("activity_log")
    .select("*, profiles(full_name, email)")
    .eq("entity_type", "event")
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Build the allowed action set based on role
  // Owner sees everything. Standard participants see universal + standard.
  // Limited participants see only universal actions.
  const allowedActions = new Set(universalActions);
  if (isOwner) {
    for (const a of ownerActions) allowedActions.add(a);
  } else if (isStandard) {
    for (const a of standardParticipantActions) allowedActions.add(a);
  }
  // Limited: only universalActions (already in the set)

  // Filter to only allowed actions, then take first 50
  const visibleActivities = (activities || [])
    .filter((a) => allowedActions.has(a.action))
    .slice(0, 50);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {visibleActivities.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {visibleActivities.map((a) => {
            const actor = a.profiles as unknown as {
              full_name: string | null;
              email: string;
            } | null;
            const actorName = actor?.full_name || actor?.email || "System";
            const label = actionLabels[a.action] || a.action;

            return (
              <div key={a.id} className="flex items-start gap-3 p-4">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                  {actorName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium text-gray-900">
                      {actorName}
                    </span>{" "}
                    <span className="text-gray-600">{label}</span>
                  </p>
                  {a.summary && a.summary !== label && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {a.summary}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {timeAgo(a.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500">
            {isOwner
              ? "No updates yet. Activity will appear here as changes are made to this event."
              : "No updates available yet. Activity relevant to your role will appear here."}
          </p>
        </div>
      )}
    </div>
  );
}
