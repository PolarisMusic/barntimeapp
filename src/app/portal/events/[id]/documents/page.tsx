import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

const typeLabels: Record<string, string> = {
  site_map: "Site Map",
  run_sheet: "Run Sheet",
  vendor_packet: "Vendor Packet",
  insurance_compliance: "Insurance / Compliance",
  stage_plot: "Stage Plot",
  parking_load_in: "Parking / Load-in",
  misc: "Misc",
};

export default async function DocumentsPage({
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

  const { data: documents } = await supabase
    .from("event_documents")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {documents && documents.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {documents.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between p-4"
            >
              <div>
                <p className="text-sm font-medium">{d.name}</p>
                <p className="text-xs text-gray-500">
                  {typeLabels[d.document_type] || d.document_type}
                  {" · "}
                  {new Date(d.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {d.visibility === "owner_only" && (
                    <span className="ml-1.5 text-amber-500">Owner only</span>
                  )}
                </p>
              </div>
              <a
                href={`/api/documents/${d.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
              >
                Download
              </a>
            </div>
          ))}
        </div>
      ) : (
        <p className="p-8 text-center text-sm text-gray-500">
          No documents available for this event.
        </p>
      )}
    </div>
  );
}
