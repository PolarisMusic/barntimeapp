import Link from "next/link";
import { notFound } from "next/navigation";
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

  const { data: locations } = await supabase
    .from("event_locations")
    .select("*")
    .eq("event_id", id)
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/portal/events/${id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; {event.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Locations</h1>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        {locations && locations.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {locations.map((l) => (
              <div key={l.id} className="p-4">
                <p className="text-sm font-medium">{l.name}</p>
                {l.address && (
                  <p className="text-xs text-gray-500">{l.address}</p>
                )}
                {l.map_url && (
                  <a
                    href={l.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    View Map
                  </a>
                )}
                {l.notes && (
                  <p className="mt-1 text-xs text-gray-400">{l.notes}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">No locations yet.</p>
        )}
      </div>
    </div>
  );
}
