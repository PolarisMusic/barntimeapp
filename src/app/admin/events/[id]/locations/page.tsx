import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { LocationForm } from "@/components/admin/location-form";
import { LocationRow } from "@/components/admin/location-row";

export default async function LocationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: event } = await supabase.from("events").select("id, name").eq("id", id).single();
  if (!event) notFound();

  const { data: locations } = await supabase
    .from("event_locations")
    .select("*")
    .eq("event_id", id)
    .order("created_at");

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/events/${id}`} className="text-sm text-gray-500 hover:text-gray-700">&larr; {event.name}</Link>
        <h1 className="mt-1 text-2xl font-bold">Locations</h1>
      </div>

      <LocationForm eventId={id} />

      <div className="rounded-lg border border-gray-200 bg-white">
        {locations && locations.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {locations.map((l) => (
              <LocationRow key={l.id} location={l} />
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">No locations yet.</p>
        )}
      </div>
    </div>
  );
}
