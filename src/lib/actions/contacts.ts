"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { checkHasAccountPermission, checkCanManageEventContacts } from "@/lib/permissions";
import { logActivity } from "./activity-log";

// --- Account Contacts (directory-level) ---

export async function createContact(formData: FormData) {
  const profile = await requireProfile();
  const accountId = formData.get("account_id") as string;

  if (!accountId) return { error: "Account is required" };

  // Permission check: account.manage_contacts via DB helper
  if (!(await checkHasAccountPermission(accountId, "account.manage_contacts"))) {
    return { error: "Permission denied: cannot manage contacts for this account" };
  }

  const supabase = await createServiceClient();
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const roleLabel = formData.get("role_label") as string;
  const notes = formData.get("notes") as string;

  if (!name?.trim()) return { error: "Contact name is required" };

  const { data: contact, error } = await supabase
    .from("account_contacts")
    .insert({
      account_id: accountId,
      name: name.trim(),
      email: email || null,
      phone: phone || null,
      role_label: roleLabel || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "account",
    entityId: accountId,
    action: "contact.created",
    summary: `Added contact "${name}"`,
  });

  revalidatePath(`/admin/accounts/${accountId}`);
  return { data: contact };
}

export async function updateContact(contactId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  // Get the contact to find the account_id for permission check
  const { data: existing } = await supabase
    .from("account_contacts")
    .select("account_id")
    .eq("id", contactId)
    .single();

  if (!existing) return { error: "Contact not found" };

  if (!(await checkHasAccountPermission(existing.account_id, "account.manage_contacts"))) {
    return { error: "Permission denied: cannot manage contacts for this account" };
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const roleLabel = formData.get("role_label") as string;
  const notes = formData.get("notes") as string;

  const { data: contact, error } = await supabase
    .from("account_contacts")
    .update({
      name: name?.trim() || undefined,
      email: email || null,
      phone: phone || null,
      role_label: roleLabel || null,
      notes: notes || null,
    })
    .eq("id", contactId)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "account",
    entityId: contact.account_id,
    action: "contact.updated",
    summary: `Updated contact "${contact.name}"`,
  });

  revalidatePath(`/admin/accounts/${contact.account_id}`);
  return { data: contact };
}

export async function deleteContact(contactId: string) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  const { data: contact } = await supabase
    .from("account_contacts")
    .select("account_id, name")
    .eq("id", contactId)
    .single();

  if (!contact) return { error: "Contact not found" };

  if (!(await checkHasAccountPermission(contact.account_id, "account.manage_contacts"))) {
    return { error: "Permission denied: cannot manage contacts for this account" };
  }

  const { error } = await supabase
    .from("account_contacts")
    .delete()
    .eq("id", contactId);

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "account",
    entityId: contact.account_id,
    action: "contact.deleted",
    summary: `Deleted contact "${contact.name}"`,
  });

  revalidatePath(`/admin/accounts/${contact.account_id}`);
  return { data: true };
}

// --- Assignable contacts for event contact picker ---

/**
 * Returns contacts from the owner account AND all participant accounts
 * that are not already assigned to this event.
 * Uses service client to bypass RLS (caller must have manage_contacts permission).
 */
export async function getAssignableContacts(eventId: string) {
  await requireProfile();

  if (!(await checkCanManageEventContacts(eventId))) {
    return [];
  }

  const supabase = await createServiceClient();

  // Get event owner account
  const { data: event } = await supabase
    .from("events")
    .select("owner_account_id")
    .eq("id", eventId)
    .single();

  if (!event) return [];

  // Get participant account IDs
  const { data: participants } = await supabase
    .from("event_accounts")
    .select("account_id")
    .eq("event_id", eventId);

  const accountIds = [
    event.owner_account_id,
    ...(participants || []).map((p) => p.account_id),
  ];

  // Get already-assigned contact IDs
  const { data: assigned } = await supabase
    .from("event_contact_roles")
    .select("contact_id")
    .eq("event_id", eventId);

  const assignedIds = new Set((assigned || []).map((a) => a.contact_id));

  // Fetch all contacts from these accounts
  const { data: contacts } = await supabase
    .from("account_contacts")
    .select("id, name, role_label, account_id, accounts(name)")
    .in("account_id", accountIds)
    .order("name");

  return (contacts || [])
    .filter((c) => !assignedIds.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      role_label: c.role_label,
      accountName: (c.accounts as unknown as { name: string })?.name || "",
    }));
}

// --- Event Contact Roles (event-scoped contact assignments) ---

export async function assignContactToEvent(formData: FormData) {
  const profile = await requireProfile();
  const eventId = formData.get("event_id") as string;

  if (!(await checkCanManageEventContacts(eventId))) {
    return { error: "Permission denied: cannot manage contacts for this event" };
  }

  const supabase = await createServiceClient();
  const contactId = formData.get("contact_id") as string;
  const roleLabel = formData.get("role_label") as string;
  const visibility = formData.get("visibility") as string;

  if (!contactId) return { error: "Contact is required" };

  const { data: assignment, error } = await supabase
    .from("event_contact_roles")
    .insert({
      event_id: eventId,
      contact_id: contactId,
      role_label: roleLabel || null,
      visibility: visibility || "owner_only",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Contact is already assigned to this event" };
    return { error: error.message };
  }

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: eventId,
    action: "contact.assigned",
    summary: `Assigned contact to event`,
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/portal/events/${eventId}`);
  return { data: assignment };
}

export async function updateContactVisibility(
  contactRoleId: string,
  eventId: string,
  visibility: string
) {
  const profile = await requireProfile();

  if (!(await checkCanManageEventContacts(eventId))) {
    return { error: "Permission denied: cannot manage contacts for this event" };
  }

  const validVisibility = visibility === "all_participants" ? "all_participants" : "owner_only";

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("event_contact_roles")
    .update({ visibility: validVisibility })
    .eq("id", contactRoleId);

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: eventId,
    action: "contact.role_updated",
    summary: `Changed contact visibility to ${validVisibility}`,
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/portal/events/${eventId}`);
  return { data: true };
}

export async function removeContactFromEvent(eventId: string, contactRoleId: string) {
  const profile = await requireProfile();

  if (!(await checkCanManageEventContacts(eventId))) {
    return { error: "Permission denied: cannot manage contacts for this event" };
  }

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("event_contact_roles")
    .delete()
    .eq("id", contactRoleId);

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: eventId,
    action: "contact.unassigned",
    summary: `Removed contact from event`,
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/portal/events/${eventId}`);
  return { data: true };
}
