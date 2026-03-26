import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function MyEventsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // Get events through account memberships (owner accounts)
  const { data: ownedEvents } = await supabase
    .from("events")
    .select("id, name, status, start_date, end_date, owner_account_id, accounts!events_owner_account_id_fkey(name)")
    .order("start_date", { ascending: false });

  // For participant events, we need a different approach since RLS handles filtering
  // The events query above already uses can_view_event via RLS

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">My Events</h1>

      {ownedEvents && ownedEvents.length > 0 ? (
        <div className="grid gap-4">
          {ownedEvents.map((event) => (
            <Link
              key={event.id}
              href={`/portal/events/${event.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{event.name}</h2>
                  <p className="text-sm text-gray-500">
                    {(event.accounts as unknown as { name: string })?.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {event.start_date && (
                    <span className="text-sm text-gray-400">
                      {new Date(event.start_date).toLocaleDateString()}
                    </span>
                  )}
                  <StatusBadge status={event.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No events available.</p>
          <p className="mt-1 text-sm text-gray-400">
            Events will appear here once you are added to an account.
          </p>
        </div>
      )}
    </div>
  );
}
