import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export default async function EventOverviewPage({
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

  const isLimited =
    !summary.is_owner &&
    summary.participant_visibility_level === "limited";

  // Build visible section stats
  type Stat = { label: string; count: number };
  const stats: Stat[] = [];

  if (!isLimited) {
    stats.push({ label: "Schedule Items", count: Number(summary.schedule_item_count ?? 0) });
  }
  stats.push({ label: "Services", count: Number(summary.service_count ?? 0) });
  stats.push({ label: "Contacts", count: Number(summary.contact_count ?? 0) });
  stats.push({ label: "Documents", count: Number(summary.document_count ?? 0) });
  if (!isLimited) {
    stats.push({ label: "Locations", count: Number(summary.location_count ?? 0) });
  }
  if (summary.is_owner) {
    stats.push({ label: "Participants", count: Number(summary.participant_count ?? 0) });
  }

  // Collect capabilities for this user
  const capabilities: string[] = [];
  if (summary.can_edit) capabilities.push("Edit Event");
  if (summary.can_manage_services) capabilities.push("Manage Services");
  if (summary.can_manage_schedule_items) capabilities.push("Manage Schedule");
  if (summary.can_manage_docs) capabilities.push("Manage Documents");
  if (summary.can_manage_contacts) capabilities.push("Manage Contacts");
  if (summary.can_confirm_vendors) capabilities.push("Confirm Vendors");
  if (summary.can_manage_participants) capabilities.push("Manage Participants");

  return (
    <div className="space-y-6">
      {summary.description && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-700">{summary.description}</p>
        </div>
      )}

      {/* Section counts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Capabilities (only show if the user has any) */}
      {capabilities.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-600">
            Your Capabilities
          </h3>
          <div className="flex flex-wrap gap-2">
            {capabilities.map((cap) => (
              <span
                key={cap}
                className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}

      {!summary.description && capabilities.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            {summary.is_owner
              ? "No event description yet. Add details in the event settings."
              : "Event details will appear here as they become available."}
          </p>
        </div>
      )}
    </div>
  );
}
