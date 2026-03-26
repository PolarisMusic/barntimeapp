"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { checkCanManageDocuments } from "@/lib/permissions";
import { logActivity } from "./activity-log";

export async function uploadDocument(formData: FormData) {
  const profile = await requireProfile();
  const eventId = formData.get("event_id") as string;

  // Permission check: can_manage_documents via DB helper
  if (!(await checkCanManageDocuments(eventId))) {
    return { error: "Permission denied: cannot manage documents for this event" };
  }

  const supabase = await createServiceClient();
  const file = formData.get("file") as File;
  const name = formData.get("name") as string;
  const documentType = formData.get("document_type") as string;
  const visibility = formData.get("visibility") as string;
  const notes = formData.get("notes") as string;

  if (!file || !file.size) return { error: "File is required" };
  if (!name?.trim()) return { error: "Document name is required" };

  // Validate visibility is one of the two allowed values
  const validVisibility = visibility === "all_participants" ? "all_participants" : "owner_only";

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
      visibility: validVisibility as "owner_only" | "all_participants",
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    // Clean up uploaded file on DB insert failure
    await supabase.storage.from("documents").remove([filePath]);
    return { error: error.message };
  }

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: eventId,
    action: "document.uploaded",
    summary: `Uploaded document "${name}"`,
    metadata: { documentType, visibility: validVisibility },
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/portal/events/${eventId}`);
  return { data: doc };
}

export async function updateDocument(documentId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  const { data: doc } = await supabase
    .from("event_documents")
    .select("event_id")
    .eq("id", documentId)
    .single();

  if (!doc) return { error: "Document not found" };

  if (!(await checkCanManageDocuments(doc.event_id))) {
    return { error: "Permission denied: cannot manage documents for this event" };
  }

  const name = formData.get("name") as string;
  const documentType = formData.get("document_type") as string;
  const visibility = formData.get("visibility") as string;
  const notes = formData.get("notes") as string;

  const validVisibility = visibility === "all_participants" ? "all_participants" : "owner_only";

  const { data: updated, error } = await supabase
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
      visibility: validVisibility as "owner_only" | "all_participants",
      notes: notes || null,
    })
    .eq("id", documentId)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: updated.event_id,
    action: "document.updated",
    summary: `Updated document "${updated.name}"`,
  });

  revalidatePath(`/admin/events/${updated.event_id}`);
  revalidatePath(`/portal/events/${updated.event_id}`);
  return { data: updated };
}

export async function deleteDocument(documentId: string) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  const { data: doc } = await supabase
    .from("event_documents")
    .select("event_id, name, file_path")
    .eq("id", documentId)
    .single();

  if (!doc) return { error: "Document not found" };

  if (!(await checkCanManageDocuments(doc.event_id))) {
    return { error: "Permission denied: cannot manage documents for this event" };
  }

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
  revalidatePath(`/portal/events/${doc.event_id}`);
  return { data: true };
}
