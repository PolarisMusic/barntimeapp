import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { EventEditForm } from "@/components/admin/event-edit-form";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: event } = await supabase
    .from("events")
    .select("*, accounts!events_owner_account_id_fkey(id, name)")
    .eq("id", id)
    .single();

  if (!event) notFound();

  const ownerAccount = event.accounts as unknown as { id: string; name: string };

  const [
    { data: participants },
    { data: services },
    { data: scheduleItems },
    { data: locations },
    { data: documents },
  ] = await Promise.all([
    supabase.from("event_accounts").select("*, accounts(id, name, type)").eq("event_id", id),
    supabase.from("event_services").select("*, accounts(name)").eq("event_id", id).order("created_at"),
    supabase.from("event_schedule_items").select("*, event_locations(name)").eq("event_id", id).order("sort_order"),
    supabase.from("event_locations").select("*").eq("event_id", id).order("created_at"),
    supabase.from("event_documents").select("*, profiles(email)").eq("event_id", id).order("created_at"),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/events" className="text-sm text-gray-500 hover:text-gray-700">&larr; Events</Link>
          <h1 className="mt-1 text-2xl font-bold">{event.name}</h1>
          <p className="text-sm text-gray-500">
            Owner: <Link href={`/admin/accounts/${ownerAccount.id}`} className="text-blue-600 hover:text-blue-800">{ownerAccount.name}</Link>
          </p>
        </div>
        <StatusBadge status={event.status} />
      </div>

      <EventEditForm event={event} />

      {/* Section nav */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <Link href={`/admin/events/${id}/participants`} className="rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200">Participants</Link>
        <Link href={`/admin/events/${id}/services`} className="rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200">Services</Link>
        <Link href={`/admin/events/${id}/schedule`} className="rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200">Schedule</Link>
        <Link href={`/admin/events/${id}/locations`} className="rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200">Locations</Link>
        <Link href={`/admin/events/${id}/contacts`} className="rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200">Contacts</Link>
        <Link href={`/admin/events/${id}/documents`} className="rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200">Documents</Link>
      </div>

      {/* Quick summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold">{participants?.length ?? 0}</p>
          <p className="text-sm text-gray-500">Participants</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold">{services?.length ?? 0}</p>
          <p className="text-sm text-gray-500">Services</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold">{scheduleItems?.length ?? 0}</p>
          <p className="text-sm text-gray-500">Schedule Items</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold">{documents?.length ?? 0}</p>
          <p className="text-sm text-gray-500">Documents</p>
        </div>
      </div>
    </div>
  );
}
