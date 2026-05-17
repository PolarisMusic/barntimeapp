"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { extractYouTubeId } from "@/lib/youtube";
import { logActivity } from "./activity-log";

type VideoFields = {
  title: string;
  caption: string | null;
  youtube_url: string;
  event_id: string | null;
  display_order: number;
  is_published: boolean;
};

function readFields(formData: FormData): VideoFields | { error: string } {
  const title = (formData.get("title") as string | null)?.trim();
  const youtubeUrl = (formData.get("youtube_url") as string | null)?.trim();
  const caption = (formData.get("caption") as string | null)?.trim() || null;
  const eventId = (formData.get("event_id") as string | null) || null;
  const displayOrderRaw = formData.get("display_order") as string | null;
  const isPublished = formData.get("is_published") === "on";

  if (!title) return { error: "Title is required" };
  if (!youtubeUrl) return { error: "YouTube URL is required" };
  if (!extractYouTubeId(youtubeUrl)) {
    return { error: "Could not parse a YouTube video ID from that URL" };
  }
  const displayOrder = displayOrderRaw ? parseInt(displayOrderRaw, 10) : 0;
  if (Number.isNaN(displayOrder)) {
    return { error: "Display order must be a number" };
  }

  return {
    title,
    caption,
    youtube_url: youtubeUrl,
    event_id: eventId,
    display_order: displayOrder,
    is_published: isPublished,
  };
}

export async function createVideo(formData: FormData) {
  const profile = await requireAdmin();
  const fields = readFields(formData);
  if ("error" in fields) return { error: fields.error };

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("videos")
    .insert({
      ...fields,
      published_at: fields.is_published ? new Date().toISOString() : null,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "video",
    entityId: data.id,
    action: "video.created",
    summary: `Created video "${data.title}"`,
    details: { subject_type: "video", subject_name: data.title },
  });

  revalidatePath("/admin/videos");
  revalidatePath("/videos");
  return { data };
}

export async function updateVideo(videoId: string, formData: FormData) {
  const profile = await requireAdmin();
  const fields = readFields(formData);
  if ("error" in fields) return { error: fields.error };

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("videos")
    .select("is_published, published_at")
    .eq("id", videoId)
    .single();

  // Only stamp published_at on the first transition to published.
  const publishedAt = fields.is_published
    ? existing?.published_at || new Date().toISOString()
    : existing?.published_at || null;

  const { data, error } = await supabase
    .from("videos")
    .update({ ...fields, published_at: publishedAt })
    .eq("id", videoId)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "video",
    entityId: videoId,
    action: "video.updated",
    summary: `Updated video "${data.title}"`,
    details: { subject_type: "video", subject_name: data.title },
  });

  revalidatePath("/admin/videos");
  revalidatePath(`/admin/videos/${videoId}`);
  revalidatePath("/videos");
  return { data };
}

export async function deleteVideo(videoId: string) {
  const profile = await requireAdmin();
  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("videos")
    .select("title")
    .eq("id", videoId)
    .single();

  const { error } = await supabase.from("videos").delete().eq("id", videoId);
  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "video",
    entityId: videoId,
    action: "video.deleted",
    summary: `Deleted video "${existing?.title ?? videoId}"`,
    details: { subject_type: "video", subject_name: existing?.title },
  });

  revalidatePath("/admin/videos");
  revalidatePath("/videos");
  return { data: true };
}
