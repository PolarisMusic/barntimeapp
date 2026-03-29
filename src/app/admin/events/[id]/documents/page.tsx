import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { DocumentUploadForm } from "@/components/admin/document-upload-form";
import { DocumentRow } from "@/components/admin/document-row";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: event } = await supabase.from("events").select("id, name").eq("id", id).single();
  if (!event) notFound();

  const { data: documents } = await supabase
    .from("event_documents")
    .select("*, profiles(email)")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/events/${id}`} className="text-sm text-gray-500 hover:text-gray-700">&larr; {event.name}</Link>
        <h1 className="mt-1 text-2xl font-bold">Documents</h1>
      </div>

      <DocumentUploadForm eventId={id} />

      <div className="rounded-lg border border-gray-200 bg-white">
        {documents && documents.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {documents.map((d) => (
              <DocumentRow
                key={d.id}
                document={{
                  ...d,
                  uploader_email: (d.profiles as unknown as { email: string })?.email || "Unknown",
                }}
              />
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">No documents yet.</p>
        )}
      </div>
    </div>
  );
}
