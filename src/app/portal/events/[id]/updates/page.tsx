import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

// Actions visible to everyone who can view the event
const universalActions = new Set([
  "event.created",
  "event.updated",
]);

// Actions visible to owner-account members (all actions)
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

type Details = Record<string, unknown> | null;

/**
 * Format an activity entry into human-readable operational copy.
 * Uses structured details when available, falls back to summary.
 */
function formatActivity(action: string, details: Details, summary: string | null): string {
  const d = details as Record<string, string> | null;
  const name = d?.subject_name;

  switch (action) {
    case "event.created":
      return name ? `Created event "${name}"` : "Created the event";
    case "event.updated":
      return name ? `Updated event "${name}"` : "Updated event details";
    case "participant.linked":
      return name ? `Added ${name} as participant` : "Added a participant";
    case "participant.unlinked":
      return name ? `Removed ${name} from event` : "Removed a participant";
    case "participant.updated": {
      const fields = (d?.field_names as unknown as string[]) || [];
      if (fields.includes("visibility")) return name ? `Changed ${name} visibility` : "Updated participant visibility";
      if (fields.includes("role_label")) return name ? `Updated ${name} role` : "Updated participant role";
      return name ? `Updated ${name} settings` : "Updated participant settings";
    }
    case "service.created":
      return name ? `Added service "${name}"` : "Added a service";
    case "service.updated":
      return name ? `Updated "${name}"` : "Updated a service";
    case "service.deleted":
      return name ? `Removed service "${name}"` : "Removed a service";
    case "service.notes_updated":
      return name ? `Updated "${name}" notes` : "Updated service notes";
    case "vendor.confirmed":
      return name ? `Confirmed vendor for "${name}"` : "Confirmed a vendor";
    case "schedule.item_created":
      return name ? `Added "${name}" to schedule` : "Added a schedule item";
    case "schedule.item_updated":
      return name ? `Updated "${name}" in schedule` : "Updated a schedule item";
    case "schedule.item_deleted":
      return name ? `Removed "${name}" from schedule` : "Removed a schedule item";
    case "schedule.notes_updated":
      return name ? `Updated notes on "${name}"` : "Updated schedule item notes";
    case "location.created":
      return name ? `Added location "${name}"` : "Added a location";
    case "location.updated":
      return name ? `Updated location "${name}"` : "Updated a location";
    case "location.deleted":
      return name ? `Removed location "${name}"` : "Removed a location";
    case "document.uploaded": {
      const docType = d?.document_type;
      if (name && docType) return `Uploaded ${name}`;
      return name ? `Uploaded "${name}"` : "Uploaded a document";
    }
    case "document.updated":
      return name ? `Updated "${name}"` : "Updated a document";
    case "document.deleted":
      return name ? `Removed "${name}"` : "Removed a document";
    case "contact.assigned":
      return name ? `Assigned ${name} to event` : "Assigned a contact";
    case "contact.unassigned":
      return name ? `Removed ${name} from event` : "Removed a contact";
    case "contact.role_updated":
      return name ? `Updated ${name} details` : "Updated contact details";
    default:
      return summary || action;
  }
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDayLabel(date: string): string {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

type Activity = {
  id: string;
  action: string;
  summary: string | null;
  details: Details;
  created_at: string;
  profiles: { full_name: string | null; email: string } | null;
};

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

  const { data: activities } = await supabase
    .from("activity_log")
    .select("id, action, summary, details, created_at, profiles(full_name, email)")
    .eq("entity_type", "event")
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Build allowed action set based on role
  const allowedActions = new Set(universalActions);
  if (isOwner) {
    for (const a of ownerActions) allowedActions.add(a);
  } else if (isStandard) {
    for (const a of standardParticipantActions) allowedActions.add(a);
  }

  const visibleActivities = (activities || [])
    .filter((a) => allowedActions.has(a.action))
    .slice(0, 50) as unknown as Activity[];

  // Group by day
  const groups: { label: string; items: Activity[] }[] = [];
  for (const a of visibleActivities) {
    const label = getDayLabel(a.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(a);
    } else {
      groups.push({ label, items: [a] });
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {groups.length > 0 ? (
        <div>
          {groups.map((group) => (
            <div key={group.label}>
              <div className="sticky top-0 border-b border-gray-100 bg-gray-50 px-4 py-2">
                <p className="text-xs font-medium text-gray-500">{group.label}</p>
              </div>
              <div className="divide-y divide-gray-50">
                {group.items.map((a) => {
                  const actor = a.profiles as unknown as {
                    full_name: string | null;
                    email: string;
                  } | null;
                  const actorName = actor?.full_name || actor?.email || "System";
                  const description = formatActivity(a.action, a.details, a.summary);

                  return (
                    <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                        {actorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium text-gray-900">
                            {actorName}
                          </span>{" "}
                          <span className="text-gray-600">{description}</span>
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">
                        {formatTime(a.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
