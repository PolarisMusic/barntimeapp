import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { EventNav } from "@/components/portal/event-nav";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
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

  // Determine which user role to show
  // For owner-account members, get their role from membership
  let userRole = "viewer";
  let isOwner = summary.is_owner as boolean;

  if (isOwner) {
    const { data: membership } = await supabase
      .from("account_memberships")
      .select("account_role")
      .eq("account_id", summary.owner_account_id)
      .eq("profile_id", profile.id)
      .single();
    userRole = membership?.account_role || "viewer";
  }

  const dateStr = summary.start_date
    ? new Date(summary.start_date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const endStr = summary.end_date
    ? new Date(summary.end_date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // Build visible tabs
  type Tab = { href: string; label: string; count?: number };
  const tabs: Tab[] = [
    { href: `/portal/events/${id}`, label: "Overview" },
  ];

  if (!isLimited) {
    tabs.push({
      href: `/portal/events/${id}/schedule`,
      label: "Schedule",
      count: Number(summary.schedule_item_count ?? 0),
    });
  }

  tabs.push({
    href: `/portal/events/${id}/services`,
    label: "Services",
    count: Number(summary.service_count ?? 0),
  });

  tabs.push({
    href: `/portal/events/${id}/contacts`,
    label: "Contacts",
    count: Number(summary.contact_count ?? 0),
  });

  tabs.push({
    href: `/portal/events/${id}/documents`,
    label: "Documents",
    count: Number(summary.document_count ?? 0),
  });

  if (!isLimited) {
    tabs.push({
      href: `/portal/events/${id}/locations`,
      label: "Locations",
      count: Number(summary.location_count ?? 0),
    });
  }

  tabs.push({
    href: `/portal/events/${id}/updates`,
    label: "Updates",
  });

  return (
    <div className="space-y-6">
      {/* Event header */}
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
          <RoleBadge role={userRole} isOwner={isOwner} />
        </div>
        <p className="text-sm text-gray-500">
          {summary.owner_account_name}
          {dateStr && ` | ${dateStr}`}
          {endStr && dateStr !== endStr && ` — ${endStr}`}
          {summary.timezone && (
            <span className="ml-1 text-gray-400">({summary.timezone})</span>
          )}
        </p>
        {summary.event_updated_at && (
          <p className="mt-0.5 text-xs text-gray-300">
            Last updated{" "}
            {new Date(summary.event_updated_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>

      {/* Tab navigation */}
      <EventNav tabs={tabs} eventId={id} />

      {/* Page content */}
      {children}
    </div>
  );
}
