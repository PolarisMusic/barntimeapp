import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function EventOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireProfile();
  const { id } = await params;
  const supabase = await createClient();

  // Use the event_summary() read model RPC
  const { data: summaryRows } = await supabase.rpc("event_summary", {
    p_event_id: id,
  });

  const summary = summaryRows?.[0];
  if (!summary) notFound();

  const isLimited =
    !summary.is_owner &&
    summary.participant_visibility_level === "limited";

  // Build section cards — only show sections the user can actually access
  const sections: { href: string; count: number; label: string }[] = [];

  if (!isLimited) {
    sections.push({
      href: `/portal/events/${id}/schedule`,
      count: Number(summary.schedule_item_count ?? 0),
      label: "Schedule",
    });
  }

  sections.push({
    href: `/portal/events/${id}/services`,
    count: Number(summary.service_count ?? 0),
    label: "Services",
  });

  sections.push({
    href: `/portal/events/${id}/documents`,
    count: Number(summary.document_count ?? 0),
    label: "Documents",
  });

  sections.push({
    href: `/portal/events/${id}/contacts`,
    count: Number(summary.contact_count ?? 0),
    label: "Contacts",
  });

  if (!isLimited) {
    sections.push({
      href: `/portal/events/${id}/locations`,
      count: Number(summary.location_count ?? 0),
      label: "Locations",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/portal/events"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; My Events
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-bold">{summary.event_name}</h1>
          <StatusBadge status={summary.event_status} />
        </div>
        <p className="text-sm text-gray-500">
          {summary.owner_account_name}
          {summary.start_date &&
            ` | ${new Date(summary.start_date).toLocaleDateString()}`}
          {summary.end_date &&
            ` — ${new Date(summary.end_date).toLocaleDateString()}`}
        </p>
      </div>

      {summary.description && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-700">{summary.description}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {sections.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300"
          >
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </Link>
        ))}
        {summary.is_owner && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-2xl font-bold">{summary.participant_count}</p>
            <p className="text-sm text-gray-500">Participants</p>
          </div>
        )}
      </div>

      {/* Inline permission indicators for the current user */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-600">
          Your Permissions
        </h3>
        <div className="flex flex-wrap gap-2">
          {summary.can_edit && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              Edit Event
            </span>
          )}
          {summary.can_manage_services && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              Manage Services
            </span>
          )}
          {summary.can_manage_schedule_items && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              Manage Schedule
            </span>
          )}
          {summary.can_manage_docs && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              Manage Documents
            </span>
          )}
          {summary.can_confirm_vendors && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
              Confirm Vendors
            </span>
          )}
          {summary.can_manage_participants && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              Manage Participants
            </span>
          )}
          {!summary.can_edit &&
            !summary.can_manage_services &&
            !summary.can_confirm_vendors && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                View Only
              </span>
            )}
        </div>
      </div>
    </div>
  );
}
