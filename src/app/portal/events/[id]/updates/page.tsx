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
  "document.uploaded",
  "document.updated",
  "document.deleted",
  "contact.assigned",
  "contact.unassigned",
  "contact.role_updated",
]);

type Details = Record<string, unknown> | null;

/**
 * Format an activity entry into human-readable operational copy.
 * Uses structured details when available, falls back to summary.
 */
const docTypeLabels: Record<string, string> = {
  site_map: "site map",
  run_sheet: "run sheet",
  vendor_packet: "vendor packet",
  insurance_compliance: "insurance doc",
  stage_plot: "stage plot",
  parking_load_in: "parking/load-in doc",
  misc: "document",
};

const visibilityLabels: Record<string, string> = {
  owner_only: "owner only",
  all_participants: "all participants",
  limited: "limited",
  standard: "standard",
};

function formatActivity(action: string, details: Details, summary: string | null): string {
  const d = details as Record<string, unknown> | null;
  const name = d?.subject_name as string | undefined;
  const docType = d?.document_type as string | undefined;
  const vis = d?.visibility_scope as string | undefined;
  const fields = (d?.field_names as string[]) || [];

  switch (action) {
    case "event.created":
      return name ? `created event "${name}"` : "created the event";
    case "event.updated":
      return name ? `updated event details for "${name}"` : "updated event details";

    // Participants
    case "participant.linked": {
      const visLabel = vis ? visibilityLabels[vis] || vis : null;
      if (name && visLabel) return `added ${name} as a ${visLabel} participant`;
      return name ? `added ${name} as a participant` : "added a participant";
    }
    case "participant.unlinked":
      return name ? `removed ${name} from the event` : "removed a participant";
    case "participant.updated": {
      if (fields.includes("visibility") && vis) {
        const visLabel = visibilityLabels[vis] || vis;
        return name ? `changed ${name} visibility to ${visLabel}` : "changed a participant's visibility";
      }
      if (fields.includes("role_label")) {
        const role = d?.role_label as string | undefined;
        if (name && role) return `set ${name}'s role to "${role}"`;
        return name ? `updated ${name}'s role` : "updated a participant's role";
      }
      return name ? `updated ${name}'s settings` : "updated participant settings";
    }

    // Services
    case "service.created":
      return name ? `added a new service: "${name}"` : "added a new service";
    case "service.updated":
      return name ? `updated service "${name}"` : "updated a service";
    case "service.deleted":
      return name ? `removed service "${name}"` : "removed a service";
    case "service.notes_updated":
      return name ? `added notes on service "${name}"` : "updated service notes";
    case "vendor.confirmed":
      return name ? `confirmed the vendor for "${name}"` : "confirmed a vendor";

    // Schedule
    case "schedule.item_created":
      return name ? `added "${name}" to the schedule` : "added a schedule item";
    case "schedule.item_updated":
      return name ? `updated "${name}" on the schedule` : "updated a schedule item";
    case "schedule.item_deleted":
      return name ? `removed "${name}" from the schedule` : "removed a schedule item";
    case "schedule.notes_updated":
      return name ? `added notes on "${name}"` : "updated schedule notes";

    // Locations
    case "location.created":
      return name ? `added a new location: "${name}"` : "added a new location";
    case "location.updated":
      return name ? `updated location "${name}"` : "updated a location";
    case "location.deleted":
      return name ? `removed location "${name}"` : "removed a location";

    // Documents
    case "document.uploaded": {
      const typeLabel = docType ? docTypeLabels[docType] || docType : null;
      if (name && typeLabel && typeLabel !== "document") return `uploaded a ${typeLabel}: "${name}"`;
      return name ? `uploaded "${name}"` : "uploaded a document";
    }
    case "document.updated": {
      const fieldLabelMap: Record<string, string> = {
        name: "name",
        document_type: "type",
        visibility: "visibility",
        notes: "notes",
      };
      const changedLabels = fields
        .map((f) => fieldLabelMap[f])
        .filter(Boolean);
      if (name && changedLabels.length > 0) {
        return `updated ${changedLabels.join(", ")} on "${name}"`;
      }
      return name ? `updated document "${name}"` : "updated a document";
    }
    case "document.deleted":
      return name ? `removed document "${name}"` : "removed a document";

    // Contacts
    case "contact.assigned": {
      const visLabel = vis ? visibilityLabels[vis] || vis : null;
      if (name && visLabel) return `assigned ${name} to the event (visible to ${visLabel})`;
      return name ? `assigned ${name} to the event` : "assigned a contact";
    }
    case "contact.unassigned":
      return name ? `removed ${name} from contacts` : "removed a contact";
    case "contact.role_updated": {
      if (fields.includes("visibility") && vis) {
        const visLabel = visibilityLabels[vis] || vis;
        return name ? `changed ${name}'s visibility to ${visLabel}` : `changed contact visibility to ${visLabel}`;
      }
      if (fields.includes("role_label")) return name ? `updated ${name}'s event role` : "updated a contact's role";
      return name ? `updated ${name}'s details` : "updated contact details";
    }
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

  // Actions where standard participants should only see participant-visible records
  const participantVisibilityGated = new Set([
    "document.uploaded",
    "document.updated",
    "document.deleted",
    "contact.assigned",
    "contact.unassigned",
    "contact.role_updated",
  ]);

  const visibleActivities = (activities || [])
    .filter((a) => {
      if (!allowedActions.has(a.action)) return false;
      // Standard participants only see document/contact actions for participant-visible records
      if (isStandard && participantVisibilityGated.has(a.action)) {
        const details = a.details as Record<string, unknown> | null;
        const vis = details?.visibility_scope as string | undefined;
        return vis === "all_participants" || vis === "standard";
      }
      return true;
    })
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
