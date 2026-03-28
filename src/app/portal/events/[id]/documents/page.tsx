import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { DocumentItem } from "@/components/portal/document-item";
import { DocumentUploadForm } from "@/components/portal/document-upload-form";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireProfile();
  const { id } = await params;
  const supabase = await createClient();

  const { data: summaryRows } = await supabase.rpc("event_summary", {
    p_event_id: id,
  });
  const summary = summaryRows?.[0];
  if (!summary) notFound();

  const canManageDocs = summary.can_manage_docs === true;
  const isOwner = summary.is_owner === true;

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
            <DocumentItem
              key={d.id}
              doc={{
                id: d.id,
                name: d.name,
                document_type: d.document_type,
                visibility: d.visibility,
                created_at: d.created_at,
              }}
              canManage={canManageDocs}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500">
            {canManageDocs
              ? "No documents yet. Use the button below to upload event documents."
              : isOwner
                ? "No documents have been uploaded for this event yet."
                : "No documents are shared for this event yet. The event owner manages document uploads."}
          </p>
        </div>
      )}

      {canManageDocs && <DocumentUploadForm eventId={id} />}
    </div>
  );
}
