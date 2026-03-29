"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile, type Profile } from "@/lib/auth";

/**
 * Server-side permission checks that call DB helper functions
 * using the user's session client (respects RLS).
 *
 * Every mutation must call these BEFORE writing with the service client.
 */

export async function requireStaffOrPermission(
  permissionCheck: (supabase: Awaited<ReturnType<typeof createClient>>, profile: Profile) => Promise<boolean>
): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.platform_role === "platform_admin" || profile.platform_role === "staff") {
    return profile;
  }
  const supabase = await createClient();
  const allowed = await permissionCheck(supabase, profile);
  if (!allowed) {
    throw new Error("Permission denied");
  }
  return profile;
}

export async function checkIsStaff(): Promise<boolean> {
  const profile = await requireProfile();
  return profile.platform_role === "platform_admin" || profile.platform_role === "staff";
}

export async function checkAccountPermission(
  accountId: string,
  permissionKey: string
): Promise<boolean> {
  const profile = await requireProfile();
  if (profile.platform_role === "platform_admin" || profile.platform_role === "staff") {
    return true;
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("has_account_permission", {
    p_account_id: accountId,
    p_permission_key: permissionKey,
  });
  return data === true;
}

export async function checkCanEditEvent(eventId: string): Promise<boolean> {
  const profile = await requireProfile();
  if (profile.platform_role === "platform_admin" || profile.platform_role === "staff") {
    return true;
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_edit_event", { p_event_id: eventId });
  return data === true;
}

export async function checkCanViewEvent(eventId: string): Promise<boolean> {
  const profile = await requireProfile();
  if (profile.platform_role === "platform_admin" || profile.platform_role === "staff") {
    return true;
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_view_event", { p_event_id: eventId });
  return data === true;
}

export async function checkCanManageEventParticipants(eventId: string): Promise<boolean> {
  const profile = await requireProfile();
  if (profile.platform_role === "platform_admin" || profile.platform_role === "staff") {
    return true;
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_manage_event_participants", { p_event_id: eventId });
  return data === true;
}

export async function checkCanConfirmVendor(eventId: string): Promise<boolean> {
  const profile = await requireProfile();
  if (profile.platform_role === "platform_admin" || profile.platform_role === "staff") {
    return true;
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_confirm_vendor", { p_event_id: eventId });
  return data === true;
}

export async function checkCanManageSchedule(eventId: string): Promise<boolean> {
  const profile = await requireProfile();
  if (profile.platform_role === "platform_admin" || profile.platform_role === "staff") {
    return true;
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_manage_schedule", { p_event_id: eventId });
  return data === true;
}

export async function checkCanManageDocuments(eventId: string): Promise<boolean> {
  const profile = await requireProfile();
  if (profile.platform_role === "platform_admin" || profile.platform_role === "staff") {
    return true;
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_manage_documents", { p_event_id: eventId });
  return data === true;
}

export async function checkCanManageServices(eventId: string): Promise<boolean> {
  const profile = await requireProfile();
  if (profile.platform_role === "platform_admin" || profile.platform_role === "staff") {
    return true;
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_manage_services", { p_event_id: eventId });
  return data === true;
}

export async function checkCanManageEventContacts(eventId: string): Promise<boolean> {
  const profile = await requireProfile();
  if (profile.platform_role === "platform_admin" || profile.platform_role === "staff") {
    return true;
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_manage_event_contacts", { p_event_id: eventId });
  return data === true;
}

export async function checkHasAccountPermission(
  accountId: string,
  permissionKey: string
): Promise<boolean> {
  const profile = await requireProfile();
  if (profile.platform_role === "platform_admin" || profile.platform_role === "staff") {
    return true;
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("has_account_permission", {
    p_account_id: accountId,
    p_permission_key: permissionKey,
  });
  return data === true;
}
