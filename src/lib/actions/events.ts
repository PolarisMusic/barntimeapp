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
  });

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/portal/events/${eventId}`);
  return { data: event };
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
    summary: `Linked participant account to event "${event.name}"`,
    metadata: { accountId, roleLabel, visibility: validVisibility },
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
    action: "participant.linked",
    summary: `Updated participant settings`,
    metadata: { accountId, ...updates },
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
  });

  revalidatePath(`/portal/events/${eventId}/contacts`);
  revalidatePath(`/admin/events/${eventId}`);
  return { data: true };
}
