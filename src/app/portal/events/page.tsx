import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleBadge } from "@/components/ui/role-badge";

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function MyEventsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: events } = await supabase.rpc("my_events_dashboard");

  const allEvents = (events || []) as DashboardEvent[];

  // Group: active/draft first, then finalized, then archived
  const active = allEvents.filter(
    (e) => e.event_status === "active" || e.event_status === "draft"
  );
  const finalized = allEvents.filter(
    (e) => e.event_status === "finalized"
  );
  const archived = allEvents.filter(
    (e) => e.event_status === "archived"
  );

  const isStaff =
    profile.platform_role === "platform_admin" ||
    profile.platform_role === "staff";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Events</h1>
        {isStaff && (
          <Link
            href="/admin/events/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Event
          </Link>
        )}
      </div>

      {allEvents.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No events available.</p>
          <p className="mt-1 text-sm text-gray-400">
            Events will appear here once you are added to an account.
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <EventGroup title="Upcoming" events={active} />
          )}
          {finalized.length > 0 && (
            <EventGroup title="Finalized" events={finalized} />
          )}
          {archived.length > 0 && (
            <EventGroup title="Archived" events={archived} />
          )}
        </>
      )}
    </div>
  );
}

type DashboardEvent = {
  event_id: string;
  event_name: string;
  event_status: string;
  start_date: string | null;
  end_date: string | null;
  owner_account_name: string;
  user_role: string;
  is_owner_account: boolean;
  primary_location_name: string | null;
  next_schedule_title: string | null;
  next_schedule_time: string | null;
  updated_at: string | null;
};

function EventGroup({
  title,
  events,
}: {
  title: string;
  events: DashboardEvent[];
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.event_id} event={event} />
        ))}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: DashboardEvent }) {
  const dateStr = formatDate(event.start_date);
  const endStr = formatDate(event.end_date);
  const dateRange =
    dateStr && endStr && dateStr !== endStr
      ? `${dateStr} — ${endStr}`
      : dateStr || "No date set";

  return (
    <Link
      href={`/portal/events/${event.event_id}`}
      className="flex flex-col rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:border-blue-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight">{event.event_name}</h3>
        <StatusBadge status={event.event_status} />
      </div>

      <div className="mt-2 space-y-1">
        <p className="text-sm text-gray-500">{dateRange}</p>
        {event.primary_location_name && (
          <p className="text-sm text-gray-400">
            {event.primary_location_name}
          </p>
        )}
      </div>

      {event.next_schedule_title && (
        <div className="mt-3 rounded-md bg-gray-50 px-3 py-2">
          <p className="text-xs font-medium text-gray-600">
            Next: {event.next_schedule_title}
          </p>
          {event.next_schedule_time && (
            <p className="text-xs text-gray-400">
              {formatTime(event.next_schedule_time)}
            </p>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-3">
        <RoleBadge role={event.user_role} isOwner={event.is_owner_account} />
        <span className="text-xs text-gray-300">
          {event.owner_account_name}
        </span>
      </div>
    </Link>
  );
}
