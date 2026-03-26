import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function MyEventsPage() {
  await requireProfile();
  const supabase = await createClient();

  // Use the my_events_dashboard() read model RPC
  const { data: events } = await supabase.rpc("my_events_dashboard");

  // Staff also see all events via the RPC (is_staff() path)
  // Deduplicate by event_id (user could see same event through multiple accounts)
  const seen = new Set<string>();
  const uniqueEvents = (events || []).filter((e: { event_id: string }) => {
    if (seen.has(e.event_id)) return false;
    seen.add(e.event_id);
    return true;
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">My Events</h1>

      {uniqueEvents.length > 0 ? (
        <div className="grid gap-4">
          {uniqueEvents.map((event: {
            event_id: string;
            event_name: string;
            event_status: string;
            start_date: string | null;
            owner_account_name: string;
            user_role: string;
            is_owner_account: boolean;
          }) => (
            <Link
              key={event.event_id}
              href={`/portal/events/${event.event_id}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{event.event_name}</h2>
                  <p className="text-sm text-gray-500">
                    {event.owner_account_name}
                    {!event.is_owner_account && (
                      <span className="ml-2 text-xs text-gray-400">
                        (participant)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {event.start_date && (
                    <span className="text-sm text-gray-400">
                      {new Date(event.start_date).toLocaleDateString()}
                    </span>
                  )}
                  <StatusBadge status={event.event_status} />
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
