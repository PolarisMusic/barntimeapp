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

  // RLS will enforce can_view_event
  const { data: event } = await supabase
    .from("events")
    .select("*, accounts!events_owner_account_id_fkey(name)")
    .eq("id", id)
    .single();

  if (!event) notFound();

  const [
    { data: services },
    { data: scheduleItems },
    { data: documents },
    { data: locations },
  ] = await Promise.all([
    supabase.from("event_services").select("id, name, status").eq("event_id", id),
    supabase.from("event_schedule_items").select("id").eq("event_id", id),
    supabase.from("event_documents").select("id").eq("event_id", id),
    supabase.from("event_locations").select("id, name").eq("event_id", id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal/events" className="text-sm text-gray-500 hover:text-gray-700">&larr; My Events</Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <StatusBadge status={event.status} />
        </div>
        <p className="text-sm text-gray-500">
          {(event.accounts as unknown as { name: string })?.name}
          {event.start_date && ` | ${new Date(event.start_date).toLocaleDateString()}`}
          {event.end_date && ` — ${new Date(event.end_date).toLocaleDateString()}`}
        </p>
      </div>

      {event.description && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-700">{event.description}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link href={`/portal/events/${id}/schedule`} className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300">
          <p className="text-2xl font-bold">{scheduleItems?.length ?? 0}</p>
          <p className="text-sm text-gray-500">Schedule Items</p>
        </Link>
        <Link href={`/portal/events/${id}/services`} className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300">
          <p className="text-2xl font-bold">{services?.length ?? 0}</p>
          <p className="text-sm text-gray-500">Services</p>
        </Link>
        <Link href={`/portal/events/${id}/documents`} className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300">
          <p className="text-2xl font-bold">{documents?.length ?? 0}</p>
          <p className="text-sm text-gray-500">Documents</p>
        </Link>
        <Link href={`/portal/events/${id}/contacts`} className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300">
          <p className="text-2xl font-bold">{locations?.length ?? 0}</p>
          <p className="text-sm text-gray-500">Locations</p>
        </Link>
      </div>

      {/* Quick schedule preview */}
      {services && services.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold">Services</h2>
          <ul className="space-y-2">
            {services.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span>{s.name}</span>
                <StatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
