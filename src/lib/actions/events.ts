"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, requireProfile } from "@/lib/auth";
import {
  checkCanEditEvent,
  checkCanManageEventParticipants,
  checkCanManageServices,
  checkCanConfirmVendor,
  checkCanManageSchedule,
  checkCanManageDocuments,
  checkCanManageEventContacts,
} from "@/lib/permissions";
import { logActivity } from "./activity-log";

// --- Events (create is staff-only, edit is permission-based) ---

export async function createEvent(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createServiceClient();

  const name = formData.get("name") as string;
  const ownerAccountId = formData.get("owner_account_id") as string;
  const startDate = formData.get("start_date") as string;
  const endDate = formData.get("end_date") as string;
  const description = formData.get("description") as string;
  const timezone = formData.get("timezone") as string;

  if (!name?.trim()) return { error: "Event name is required" };
  if (!ownerAccountId) return { error: "Owner account is required" };

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      name: name.trim(),
      owner_account_id: ownerAccountId,
      start_date: startDate || null,
      end_date: endDate || null,
      description: description || null,
      timezone: timezone || "America/Los_Angeles",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: event.id,
    action: "event.created",
    summary: `Created event "${event.name}"`,
    details: { subject_type: "event", subject_name: event.name },
  });

  revalidatePath("/admin/events");
  return { data: event };
}

export async function updateEvent(eventId: string, formData: FormData) {
  const profile = await requireProfile();

  // Permission check: can_edit_event via DB helper
  if (!(await checkCanEditEvent(eventId))) {
    return { error: "Permission denied: cannot edit this event" };
  }

  const supabase = await createServiceClient();
  const name = formData.get("name") as string;
  const status = formData.get("status") as string;
  const startDate = formData.get("start_date") as string;
  const endDate = formData.get("end_date") as string;
  const description = formData.get("description") as string;
  const notes = formData.get("notes") as string;
  const timezone = formData.get("timezone") as string;

  // Public listing & ticketing
  const isPublic = formData.get("is_public") === "on";
  const publicSlugRaw = (formData.get("public_slug") as string | null)?.trim() || null;
  const publicSummary = (formData.get("public_summary") as string | null)?.trim() || null;
  const heroImageUrl = (formData.get("hero_image_url") as string | null)?.trim() || null;
  const ticketingEnabled = formData.get("ticketing_enabled") === "on";
  const ticketPriceRaw = formData.get("ticket_price_dollars") as string | null;
  const ticketCapacityRaw = formData.get("ticket_capacity") as string | null;
  const addressRevealAt = (formData.get("address_reveal_at") as string | null) || null;
  const publicAddress = (formData.get("public_address") as string | null)?.trim() || null;

  if (isPublic && !publicSlugRaw) {
    return { error: "Public events require a URL slug" };
  }
  if (publicSlugRaw && !/^[a-z0-9-]+$/.test(publicSlugRaw)) {
    return { error: "Slug may contain only lowercase letters, numbers, and hyphens" };
  }

  let ticketPriceCents: number | null = null;
  if (ticketPriceRaw && ticketPriceRaw.trim()) {
    const dollars = Number(ticketPriceRaw);
    if (!Number.isFinite(dollars) || dollars < 0) {
      return { error: "Ticket price must be a non-negative number" };
    }
    ticketPriceCents = Math.round(dollars * 100);
  }

  let ticketCapacity: number | null = null;
  if (ticketCapacityRaw && ticketCapacityRaw.trim()) {
    const cap = parseInt(ticketCapacityRaw, 10);
    if (!Number.isFinite(cap) || cap < 0) {
      return { error: "Ticket capacity must be a non-negative integer" };
    }
    ticketCapacity = cap;
  }

  const { data: event, error } = await supabase
    .from("events")
    .update({
      name: name?.trim() || undefined,
      status: status as "draft" | "active" | "finalized" | "archived" | undefined,
      start_date: startDate || null,
      end_date: endDate || null,
      description: description || null,
      notes: notes || null,
      timezone: timezone || undefined,
      is_public: isPublic,
      public_slug: publicSlugRaw,
      public_summary: publicSummary,
      hero_image_url: heroImageUrl,
      ticketing_enabled: ticketingEnabled,
      ticket_price_cents: ticketPriceCents,
      ticket_capacity: ticketCapacity,
      address_reveal_at: addressRevealAt || null,
      public_address: publicAddress,
    })
    .eq("id", eventId)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: eventId,
    action: "event.updated",
    summary: `Updated event "${event.name}"`,
    details: { subject_type: "event", subject_name: event.name },
  });

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/portal/events/${eventId}`);
  revalidatePath("/events");
  if (event.public_slug) {
    revalidatePath(`/events/${event.public_slug}`);
  }
  return { data: event };
}

const HERO_BUCKET = "event-hero-images";
const HERO_MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const HERO_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export async function uploadEventHero(formData: FormData) {
  const profile = await requireAdmin();
  const eventId = formData.get("event_id") as string;
  const file = formData.get("file") as File | null;

  if (!eventId) return { error: "Event id is required" };
  if (!file || !file.size) return { error: "File is required" };
  if (file.size > HERO_MAX_BYTES) {
    return { error: "Image is too large (max 8 MB)" };
  }
  if (!HERO_ALLOWED_TYPES.has(file.type)) {
    return { error: "Image must be JPEG, PNG, WebP, or AVIF" };
  }

  const supabase = await createServiceClient();

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const filePath = `${eventId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(HERO_BUCKET)
    .upload(filePath, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(HERO_BUCKET).getPublicUrl(filePath);

  const { data: previous } = await supabase
    .from("events")
    .select("hero_image_url, public_slug")
    .eq("id", eventId)
    .maybeSingle();

  const { data: event, error } = await supabase
    .from("events")
    .update({ hero_image_url: publicUrl })
    .eq("id", eventId)
    .select("id, public_slug, hero_image_url")
    .single();

  if (error) {
    await supabase.storage.from(HERO_BUCKET).remove([filePath]);
    return { error: error.message };
  }

  // Best-effort cleanup of the previous hero, if it was hosted in this bucket.
  const previousUrl = previous?.hero_image_url;
  if (previousUrl) {
    const marker = `/storage/v1/object/public/${HERO_BUCKET}/`;
    const idx = previousUrl.indexOf(marker);
    if (idx !== -1) {
      const oldPath = previousUrl.slice(idx + marker.length);
      if (oldPath && oldPath !== filePath) {
        await supabase.storage.from(HERO_BUCKET).remove([oldPath]);
      }
    }
  }

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: eventId,
    action: "event.hero_uploaded",
    summary: "Updated event hero image",
    details: { subject_type: "event", field_names: ["hero_image_url"] },
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/events");
  if (event.public_slug) revalidatePath(`/events/${event.public_slug}`);

  return { data: { url: publicUrl } };
}

// --- Participants ---

export async function linkParticipantAccount(formData: FormData) {
  const profile = await requireProfile();
  const eventId = formData.get("event_id") as string;
  const accountId = formData.get("account_id") as string;
  const roleLabel = formData.get("role_label") as string;
  const visibility = formData.get("visibility") as string;

  if (!eventId || !accountId)
    return { error: "Event and account are required" };

  // Permission check: can_manage_event_participants via DB helper
  if (!(await checkCanManageEventParticipants(eventId))) {
    return { error: "Permission denied: cannot manage participants for this event" };
  }

  const supabase = await createServiceClient();

  // Verify not linking the owner as participant
  const { data: event } = await supabase
    .from("events")
    .select("owner_account_id, name")
    .eq("id", eventId)
    .single();

  if (!event) return { error: "Event not found" };
  if (event.owner_account_id === accountId) {
    return { error: "Cannot link the owner account as a participant" };
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("name")
    .eq("id", accountId)
    .single();

  const validVisibility = visibility === "standard" ? "standard" : "limited";

  const { error } = await supabase.from("event_accounts").insert({
    event_id: eventId,
    account_id: accountId,
    role_label: roleLabel || null,
    visibility: validVisibility,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "Account is already linked to this event" };
    return { error: error.message };
  }

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: eventId,
    action: "participant.linked",
    summary: `Linked participant account to event`,
    metadata: { accountId, roleLabel, visibility: validVisibility },
    details: { subject_type: "participant", subject_name: account?.name || accountId, role_label: roleLabel, visibility_scope: validVisibility },
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/portal/events/${eventId}`);
  return { data: true };
}

export async function updateParticipant(
  eventId: string,
  accountId: string,
  updates: { role_label?: string; visibility?: string }
) {
  const profile = await requireProfile();

  if (!(await checkCanManageEventParticipants(eventId))) {
    return { error: "Permission denied: cannot manage participants for this event" };
  }

  const supabase = await createServiceClient();

  const updateData: Record<string, unknown> = {};
  if (updates.role_label !== undefined) {
    updateData.role_label = updates.role_label || null;
  }
  if (updates.visibility !== undefined) {
    updateData.visibility = updates.visibility === "standard" ? "standard" : "limited";
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("name")
    .eq("id", accountId)
    .single();

  const { error } = await supabase
    .from("event_accounts")
    .update(updateData)
    .eq("event_id", eventId)
    .eq("account_id", accountId);

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: eventId,
    action: "participant.updated",
    summary: `Updated participant settings`,
    metadata: { accountId, ...updates },
    details: {
      subject_type: "participant",
      subject_name: account?.name || accountId,
      field_names: Object.keys(updates),
      ...(updates.visibility !== undefined && { visibility_scope: updateData.visibility as string }),
      ...(updates.role_label !== undefined && { role_label: updates.role_label || null }),
    },
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/portal/events/${eventId}`);
  return { data: true };
}

export async function unlinkParticipantAccount(eventId: string, accountId: string) {
  const profile = await requireProfile();

  if (!(await checkCanManageEventParticipants(eventId))) {
    return { error: "Permission denied: cannot manage participants for this event" };
  }

  const supabase = await createServiceClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("name")
    .eq("id", accountId)
    .single();

  const { error } = await supabase
    .from("event_accounts")
    .delete()
    .eq("event_id", eventId)
    .eq("account_id", accountId);

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: eventId,
    action: "participant.unlinked",
    summary: `Removed participant account from event`,
    metadata: { accountId },
    details: { subject_type: "participant", subject_name: account?.name || accountId },
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/portal/events/${eventId}`);
  return { data: true };
}

// --- Event Services ---

export async function createService(formData: FormData) {
  const profile = await requireProfile();
  const eventId = formData.get("event_id") as string;

  if (!(await checkCanManageServices(eventId))) {
    return { error: "Permission denied: cannot manage services for this event" };
  }

  const supabase = await createServiceClient();
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const accountId = formData.get("account_id") as string;

  if (!name?.trim()) return { error: "Service name is required" };

  const { data: service, error } = await supabase
    .from("event_services")
    .insert({
      event_id: eventId,
      name: name.trim(),
      description: description || null,
      account_id: accountId || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: eventId,
    action: "service.created",
    summary: `Added service "${name}" to event`,
    details: { subject_type: "service", subject_name: name },
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/portal/events/${eventId}`);
  return { data: service };
}

export async function updateService(serviceId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  // Get the event_id to check permission
  const { data: service } = await supabase
    .from("event_services")
    .select("event_id")
    .eq("id", serviceId)
    .single();

  if (!service) return { error: "Service not found" };

  if (!(await checkCanManageServices(service.event_id))) {
    return { error: "Permission denied: cannot manage services for this event" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const accountId = formData.get("account_id") as string;
  const status = formData.get("status") as string;

  const { data: updated, error } = await supabase
    .from("event_services")
    .update({
      name: name?.trim() || undefined,
      description: description || null,
      account_id: accountId || null,
      status: status as "pending" | "confirmed" | "cancelled" | undefined,
    })
    .eq("id", serviceId)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: updated.event_id,
    action: "service.updated",
    summary: `Updated service "${updated.name}"`,
    details: { subject_type: "service", subject_name: updated.name },
  });

  revalidatePath(`/admin/events/${updated.event_id}`);
  revalidatePath(`/portal/events/${updated.event_id}`);
  return { data: updated };
}

export async function confirmVendor(serviceId: string) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  // Get the event_id to check permission
  const { data: service } = await supabase
    .from("event_services")
    .select("event_id, name, status")
    .eq("id", serviceId)
    .single();

  if (!service) return { error: "Service not found" };
  if (service.status !== "pending") return { error: "Service is not pending" };

  // Critical permission check: can_confirm_vendor via DB helper
  if (!(await checkCanConfirmVendor(service.event_id))) {
    return { error: "Permission denied: you do not have vendor confirmation permission" };
  }

  const { data: updated, error } = await supabase
    .from("event_services")
    .update({
      status: "confirmed" as const,
      confirmed_by: profile.id,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", serviceId)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: service.event_id,
    action: "vendor.confirmed",
    summary: `Confirmed vendor service "${service.name}"`,
    details: { subject_type: "service", subject_name: service.name },
  });

  revalidatePath(`/admin/events/${service.event_id}`);
  revalidatePath(`/portal/events/${service.event_id}`);
  return { data: updated };
}

export async function deleteService(serviceId: string) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  const { data: service } = await supabase
    .from("event_services")
    .select("event_id, name")
    .eq("id", serviceId)
    .single();

  if (!service) return { error: "Service not found" };

  if (!(await checkCanManageServices(service.event_id))) {
    return { error: "Permission denied: cannot manage services for this event" };
  }

  const { error } = await supabase
    .from("event_services")
    .delete()
    .eq("id", serviceId);

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: service.event_id,
    action: "service.deleted",
    summary: `Deleted service "${service.name}"`,
    details: { subject_type: "service", subject_name: service.name },
  });

  revalidatePath(`/admin/events/${service.event_id}`);
  revalidatePath(`/portal/events/${service.event_id}`);
  return { data: true };
}

// --- Event Schedule Items ---

export async function createScheduleItem(formData: FormData) {
  const profile = await requireProfile();
  const eventId = formData.get("event_id") as string;

  if (!(await checkCanManageSchedule(eventId))) {
    return { error: "Permission denied: cannot manage schedule for this event" };
  }

  const supabase = await createServiceClient();
  const title = formData.get("title") as string;
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  const locationId = formData.get("location_id") as string;
  const description = formData.get("description") as string;

  if (!title?.trim()) return { error: "Title is required" };

  const { data: item, error } = await supabase
    .from("event_schedule_items")
    .insert({
      event_id: eventId,
      title: title.trim(),
      start_time: startTime || null,
      end_time: endTime || null,
      location_id: locationId || null,
      description: description || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: eventId,
    action: "schedule.item_created",
    summary: `Added schedule item "${title}"`,
    details: { subject_type: "schedule", subject_name: title },
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/portal/events/${eventId}`);
  return { data: item };
}

export async function updateScheduleItem(itemId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  const { data: item } = await supabase
    .from("event_schedule_items")
    .select("event_id")
    .eq("id", itemId)
    .single();

  if (!item) return { error: "Schedule item not found" };

  if (!(await checkCanManageSchedule(item.event_id))) {
    return { error: "Permission denied: cannot manage schedule for this event" };
  }

  const title = formData.get("title") as string;
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  const locationId = formData.get("location_id") as string;
  const description = formData.get("description") as string;
  const sortOrder = formData.get("sort_order") as string;

  const { data: updated, error } = await supabase
    .from("event_schedule_items")
    .update({
      title: title?.trim() || undefined,
      start_time: startTime || null,
      end_time: endTime || null,
      location_id: locationId || null,
      description: description || null,
      sort_order: sortOrder ? parseInt(sortOrder) : undefined,
    })
    .eq("id", itemId)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: updated.event_id,
    action: "schedule.item_updated",
    summary: `Updated schedule item "${updated.title}"`,
    details: { subject_type: "schedule", subject_name: updated.title },
  });

  revalidatePath(`/admin/events/${updated.event_id}`);
  revalidatePath(`/portal/events/${updated.event_id}`);
  return { data: updated };
}

export async function deleteScheduleItem(itemId: string) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  const { data: item } = await supabase
    .from("event_schedule_items")
    .select("event_id, title")
    .eq("id", itemId)
    .single();

  if (!item) return { error: "Schedule item not found" };

  if (!(await checkCanManageSchedule(item.event_id))) {
    return { error: "Permission denied: cannot manage schedule for this event" };
  }

  const { error } = await supabase
    .from("event_schedule_items")
    .delete()
    .eq("id", itemId);

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: item.event_id,
    action: "schedule.item_deleted",
    summary: `Deleted schedule item "${item.title}"`,
    details: { subject_type: "schedule", subject_name: item.title },
  });

  revalidatePath(`/admin/events/${item.event_id}`);
  revalidatePath(`/portal/events/${item.event_id}`);
  return { data: true };
}

// --- Event Locations ---

export async function createLocation(formData: FormData) {
  const profile = await requireProfile();
  const eventId = formData.get("event_id") as string;

  if (!(await checkCanEditEvent(eventId))) {
    return { error: "Permission denied: cannot edit this event" };
  }

  const supabase = await createServiceClient();
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const location_type = formData.get("location_type") as string;
  const map_url = formData.get("map_url") as string;
  const notes = formData.get("notes") as string;

  if (!name?.trim()) return { error: "Location name is required" };

  const { data: location, error } = await supabase
    .from("event_locations")
    .insert({
      event_id: eventId,
      name: name.trim(),
      address: address || null,
      location_type: location_type || null,
      map_url: map_url || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: eventId,
    action: "location.created",
    summary: `Added location "${name}"`,
    details: { subject_type: "location", subject_name: name },
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/portal/events/${eventId}`);
  return { data: location };
}

export async function updateLocation(locationId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  const { data: location } = await supabase
    .from("event_locations")
    .select("event_id")
    .eq("id", locationId)
    .single();

  if (!location) return { error: "Location not found" };

  if (!(await checkCanEditEvent(location.event_id))) {
    return { error: "Permission denied: cannot edit this event" };
  }

  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const location_type = formData.get("location_type") as string;
  const map_url = formData.get("map_url") as string;
  const notes = formData.get("notes") as string;

  const { data: updated, error } = await supabase
    .from("event_locations")
    .update({
      name: name?.trim() || undefined,
      address: address || null,
      location_type: location_type || null,
      map_url: map_url || null,
      notes: notes || null,
    })
    .eq("id", locationId)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: updated.event_id,
    action: "location.updated",
    summary: `Updated location "${updated.name}"`,
    details: { subject_type: "location", subject_name: updated.name },
  });

  revalidatePath(`/admin/events/${updated.event_id}`);
  revalidatePath(`/portal/events/${updated.event_id}`);
  return { data: updated };
}

export async function deleteLocation(locationId: string) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  const { data: location } = await supabase
    .from("event_locations")
    .select("event_id, name")
    .eq("id", locationId)
    .single();

  if (!location) return { error: "Location not found" };

  if (!(await checkCanEditEvent(location.event_id))) {
    return { error: "Permission denied: cannot edit this event" };
  }

  const { error } = await supabase
    .from("event_locations")
    .delete()
    .eq("id", locationId);

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: location.event_id,
    action: "location.deleted",
    summary: `Deleted location "${location.name}"`,
    details: { subject_type: "location", subject_name: location.name },
  });

  revalidatePath(`/admin/events/${location.event_id}`);
  revalidatePath(`/portal/events/${location.event_id}`);
  return { data: true };
}

// --- Portal-facing lightweight note editors ---

export async function updateScheduleItemNotes(
  itemId: string,
  description: string
) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  const { data: item } = await supabase
    .from("event_schedule_items")
    .select("event_id, title")
    .eq("id", itemId)
    .single();

  if (!item) return { error: "Schedule item not found" };

  if (!(await checkCanManageSchedule(item.event_id))) {
    return { error: "Permission denied" };
  }

  const { error } = await supabase
    .from("event_schedule_items")
    .update({ description: description || null })
    .eq("id", itemId);

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: item.event_id,
    action: "schedule.notes_updated",
    summary: `Updated notes on "${item.title}"`,
    details: { subject_type: "schedule", subject_name: item.title, field_names: ["notes"] },
  });

  revalidatePath(`/portal/events/${item.event_id}/schedule`);
  revalidatePath(`/admin/events/${item.event_id}`);
  return { data: true };
}

export async function updateServiceNotes(
  serviceId: string,
  description: string
) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  const { data: service } = await supabase
    .from("event_services")
    .select("event_id, name")
    .eq("id", serviceId)
    .single();

  if (!service) return { error: "Service not found" };

  if (!(await checkCanManageServices(service.event_id))) {
    return { error: "Permission denied" };
  }

  const { error } = await supabase
    .from("event_services")
    .update({ description: description || null })
    .eq("id", serviceId);

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: service.event_id,
    action: "service.notes_updated",
    summary: `Updated notes on service "${service.name}"`,
    details: { subject_type: "service", subject_name: service.name, field_names: ["notes"] },
  });

  revalidatePath(`/portal/events/${service.event_id}/services`);
  revalidatePath(`/admin/events/${service.event_id}`);
  return { data: true };
}

export async function updateEventContactRoleLabel(
  assignmentId: string,
  eventId: string,
  roleLabel: string
) {
  const profile = await requireProfile();

  if (!(await checkCanManageEventContacts(eventId))) {
    return { error: "Permission denied" };
  }

  const supabase = await createServiceClient();

  // Fetch contact name for activity log
  const { data: assignment } = await supabase
    .from("event_contact_roles")
    .select("contact_id, account_contacts(name)")
    .eq("id", assignmentId)
    .single();

  const contactName = (assignment?.account_contacts as unknown as { name: string })?.name;

  const { error } = await supabase
    .from("event_contact_roles")
    .update({ role_label: roleLabel || null })
    .eq("id", assignmentId);

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: eventId,
    action: "contact.role_updated",
    summary: `Updated contact role label`,
    details: { subject_type: "contact", subject_name: contactName || undefined, field_names: ["role_label"] },
  });

  revalidatePath(`/portal/events/${eventId}/contacts`);
  revalidatePath(`/admin/events/${eventId}`);
  return { data: true };
}

// --- Linkable accounts for participant management ---

export async function getLinkableAccounts(eventId: string) {
  await requireProfile();

  if (!(await checkCanManageEventParticipants(eventId))) {
    return { data: [] };
  }

  const supabase = await createServiceClient();

  const { data: event } = await supabase
    .from("events")
    .select("owner_account_id")
    .eq("id", eventId)
    .single();

  if (!event) return { data: [] };

  // Get already-linked participant account IDs
  const { data: linked } = await supabase
    .from("event_accounts")
    .select("account_id")
    .eq("event_id", eventId);

  const linkedIds = new Set(linked?.map((r) => r.account_id) ?? []);

  // Get curated allowlist for this owner account
  const { data: allowlist } = await supabase
    .from("account_linkable_accounts")
    .select("linkable_account_id, accounts!account_linkable_accounts_linkable_account_id_fkey(id, name, type, status)")
    .eq("owner_account_id", event.owner_account_id);

  const available = (allowlist || [])
    .map((row) => {
      const acct = row.accounts as unknown as { id: string; name: string; type: string; status: string };
      return acct;
    })
    .filter((a) => a && a.status === "active" && !linkedIds.has(a.id));

  return { data: available };
}
