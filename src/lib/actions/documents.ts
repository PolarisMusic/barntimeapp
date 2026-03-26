"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { logActivity } from "./activity-log";

export async function uploadDocument(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  const eventId = formData.get("event_id") as string;
  const file = formData.get("file") as File;
  const name = formData.get("name") as string;
  const documentType = formData.get("document_type") as string;
  const visibility = formData.get("visibility") as string;
  const notes = formData.get("notes") as string;

  if (!file || !file.size) return { error: "File is required" };
  if (!name?.trim()) return { error: "Document name is required" };

  // Upload file to Supabase Storage
  const filePath = `events/${eventId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file);

  if (uploadError) return { error: uploadError.message };

  const { data: doc, error } = await supabase
    .from("event_documents")
    .insert({
      event_id: eventId,
      uploaded_by: profile.id,
      name: name.trim(),
      file_path: filePath,
      file_type: file.type || null,
      document_type: (documentType || "misc") as
        | "site_map"
        | "run_sheet"
        | "vendor_packet"
        | "insurance_compliance"
        | "stage_plot"
        | "parking_load_in"
        | "misc",
      visibility: (visibility || "owner_only") as
        | "owner_only"
        | "all_participants"
        | "specific_accounts",
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: eventId,
    action: "document.uploaded",
    summary: `Uploaded document "${name}"`,
    metadata: { documentType, visibility },
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/portal/events/${eventId}`);
  return { data: doc };
}

export async function updateDocument(documentId: string, formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createServiceClient();

  const name = formData.get("name") as string;
  const documentType = formData.get("document_type") as string;
  const visibility = formData.get("visibility") as string;
  const notes = formData.get("notes") as string;

  const { data: doc, error } = await supabase
    .from("event_documents")
    .update({
      name: name?.trim() || undefined,
      document_type: documentType as
        | "site_map"
        | "run_sheet"
        | "vendor_packet"
        | "insurance_compliance"
        | "stage_plot"
        | "parking_load_in"
        | "misc"
        | undefined,
      visibility: visibility as
        | "owner_only"
        | "all_participants"
        | "specific_accounts"
        | undefined,
      notes: notes || null,
    })
    .eq("id", documentId)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/admin/events/${doc.event_id}`);
  return { data: doc };
}

export async function deleteDocument(documentId: string) {
  const profile = await requireAdmin();
  const supabase = await createServiceClient();

  const { data: doc } = await supabase
    .from("event_documents")
    .select("event_id, name, file_path")
    .eq("id", documentId)
    .single();

  if (!doc) return { error: "Document not found" };

  // Delete file from storage
  await supabase.storage.from("documents").remove([doc.file_path]);

  const { error } = await supabase
    .from("event_documents")
    .delete()
    .eq("id", documentId);

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: doc.event_id,
    action: "document.deleted",
    summary: `Deleted document "${doc.name}"`,
  });

  revalidatePath(`/admin/events/${doc.event_id}`);
  return { data: true };
}
