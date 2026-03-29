import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export default async function LocationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireProfile();
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!event) notFound();

  // Route guard: limited participants cannot access locations
  const { data: summaryRows } = await supabase.rpc("event_summary", {
    p_event_id: id,
  });
  const summary = summaryRows?.[0];
  if (summary && !summary.is_owner && summary.participant_visibility_level === "limited") {
    redirect(`/portal/events/${id}`);
  }

  const { data: locations } = await supabase
    .from("event_locations")
    .select("*")
    .eq("event_id", id)
    .order("name");

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {locations && locations.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {locations.map((l) => (
            <div key={l.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {l.name}
                    {l.location_type && (
                      <span className="ml-2 text-xs text-gray-400">
                        ({l.location_type})
                      </span>
                    )}
                  </p>
                  {l.address && (
                    <p className="text-xs text-gray-500">{l.address}</p>
                  )}
                  {l.notes && (
                    <p className="mt-1 text-xs text-gray-400">{l.notes}</p>
                  )}
                </div>
                {l.map_url && (
                  <a
                    href={l.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                  >
                    View Map
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500">
            {summary?.is_owner
              ? "No locations have been added to this event yet."
              : "Event locations will appear here once the organizer adds them."}
          </p>
        </div>
      )}
    </div>
  );
}
