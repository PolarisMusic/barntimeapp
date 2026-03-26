"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "./activity-log";

export async function createContact(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createServiceClient();

  const accountId = formData.get("account_id") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const roleLabel = formData.get("role_label") as string;
  const notes = formData.get("notes") as string;

  if (!name?.trim()) return { error: "Contact name is required" };
  if (!accountId) return { error: "Account is required" };

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
  const profile = await requireAdmin();
  const supabase = await createServiceClient();

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
  const profile = await requireAdmin();
  const supabase = await createServiceClient();

  const { data: contact } = await supabase
    .from("account_contacts")
    .select("account_id, name")
    .eq("id", contactId)
    .single();

  if (!contact) return { error: "Contact not found" };

  const { error } = await supabase
    .from("account_contacts")
    .delete()
    .eq("id", contactId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/accounts/${contact.account_id}`);
  return { data: true };
}
