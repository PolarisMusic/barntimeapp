"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { checkHasAccountPermission } from "@/lib/permissions";
import { logActivity } from "./activity-log";

// --- Account CRUD (staff-only for global operations) ---

export async function createAccount(formData: FormData) {
  // Staff-only: creating accounts globally
  const profile = await requireAdmin();
  const supabase = await createServiceClient();

  const name = formData.get("name") as string;
  const type = formData.get("type") as string;

  if (!name?.trim()) {
    return { error: "Account name is required" };
  }

  const { data: account, error } = await supabase
    .from("accounts")
    .insert({
      name: name.trim(),
      type: (type || "client") as "client" | "vendor" | "venue" | "internal" | "performer",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "account",
    entityId: account.id,
    action: "account.created",
    summary: `Created account "${account.name}"`,
  });

  revalidatePath("/admin/accounts");
  return { data: account };
}

export async function updateAccount(accountId: string, formData: FormData) {
  // Staff-only: modifying account type/status is administrative
  const profile = await requireAdmin();
  const supabase = await createServiceClient();

  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const status = formData.get("status") as string;
  const notes = formData.get("notes") as string;

  const { data: account, error } = await supabase
    .from("accounts")
    .update({
      name: name?.trim() || undefined,
      type: type as "client" | "vendor" | "venue" | "internal" | "performer" | undefined,
      status: status as "active" | "inactive" | "archived" | undefined,
      notes: notes || null,
    })
    .eq("id", accountId)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "account",
    entityId: accountId,
    action: "account.updated",
    summary: `Updated account "${account.name}"`,
  });

  revalidatePath("/admin/accounts");
  revalidatePath(`/admin/accounts/${accountId}`);
  return { data: account };
}

// --- Member Management (staff-only for invite, permission-based for role changes) ---

export async function inviteMemberToAccount(formData: FormData) {
  // Staff-only: inviting members uses admin API
  const profile = await requireAdmin();
  const supabase = await createServiceClient();

  const accountId = formData.get("account_id") as string;
  const email = formData.get("email") as string;
  const accountRole = formData.get("account_role") as string;

  if (!email?.trim()) return { error: "Email is required" };
  if (!accountId) return { error: "Account is required" };

  // Find or invite the user
  const { data: existingUsers } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .limit(1);

  let profileId: string;

  if (existingUsers && existingUsers.length > 0) {
    profileId = existingUsers[0].id;
  } else {
    // Invite via Supabase auth — creates the user and sends magic link
    const { data: invite, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email.trim().toLowerCase());

    if (inviteError) return { error: inviteError.message };
    profileId = invite.user.id;
  }

  // Create membership
  const { error: memberError } = await supabase
    .from("account_memberships")
    .insert({
      account_id: accountId,
      profile_id: profileId,
      account_role: (accountRole || "viewer") as
        | "account_owner"
        | "account_manager"
        | "event_coordinator"
        | "viewer",
    });

  if (memberError) {
    if (memberError.code === "23505") {
      return { error: "This user is already a member of this account" };
    }
    return { error: memberError.message };
  }

  await logActivity({
    actorId: profile.id,
    entityType: "account",
    entityId: accountId,
    action: "member.invited",
    summary: `Invited ${email} to account as ${accountRole}`,
    metadata: { email, accountRole },
  });

  revalidatePath(`/admin/accounts/${accountId}`);
  return { data: { profileId } };
}

export async function updateMemberRole(membershipId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  // Get membership to find account_id for permission check
  const { data: membership } = await supabase
    .from("account_memberships")
    .select("account_id, profile_id")
    .eq("id", membershipId)
    .single();

  if (!membership) return { error: "Membership not found" };

  // Permission check: account.manage_members via DB helper
  if (!(await checkHasAccountPermission(membership.account_id, "account.manage_members"))) {
    return { error: "Permission denied: cannot manage members for this account" };
  }

  // Prevent self-demotion for safety
  if (membership.profile_id === profile.id) {
    return { error: "Cannot change your own role" };
  }

  const accountRole = formData.get("account_role") as string;

  const { data: updated, error } = await supabase
    .from("account_memberships")
    .update({
      account_role: accountRole as
        | "account_owner"
        | "account_manager"
        | "event_coordinator"
        | "viewer",
    })
    .eq("id", membershipId)
    .select("*, accounts(name)")
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "account",
    entityId: updated.account_id,
    action: "member.role_changed",
    summary: `Changed member role to ${accountRole}`,
  });

  revalidatePath(`/admin/accounts/${updated.account_id}`);
  return { data: updated };
}

export async function removeMember(membershipId: string) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  // Get membership info before deleting
  const { data: membership } = await supabase
    .from("account_memberships")
    .select("account_id, profile_id, profiles(email)")
    .eq("id", membershipId)
    .single();

  if (!membership) return { error: "Membership not found" };

  // Permission check: account.manage_members via DB helper
  if (!(await checkHasAccountPermission(membership.account_id, "account.manage_members"))) {
    return { error: "Permission denied: cannot manage members for this account" };
  }

  // Prevent self-removal
  if (membership.profile_id === profile.id) {
    return { error: "Cannot remove yourself from the account" };
  }

  const { error } = await supabase
    .from("account_memberships")
    .delete()
    .eq("id", membershipId);

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "account",
    entityId: membership.account_id,
    action: "member.removed",
    summary: `Removed member from account`,
  });

  revalidatePath(`/admin/accounts/${membership.account_id}`);
  return { data: true };
}

// --- Permission Grants (staff or account.manage_members holders) ---

export async function addPermission(membershipId: string, permissionKey: string) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  const { data: membership } = await supabase
    .from("account_memberships")
    .select("account_id")
    .eq("id", membershipId)
    .single();

  if (!membership) return { error: "Membership not found" };

  if (!(await checkHasAccountPermission(membership.account_id, "account.manage_members"))) {
    return { error: "Permission denied" };
  }

  const { error } = await supabase
    .from("account_membership_permissions")
    .insert({
      membership_id: membershipId,
      permission_key: permissionKey,
    });

  if (error) {
    if (error.code === "23505") return { error: "Permission already granted" };
    return { error: error.message };
  }

  return { data: true };
}

export async function removePermission(membershipId: string, permissionKey: string) {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  const { data: membership } = await supabase
    .from("account_memberships")
    .select("account_id")
    .eq("id", membershipId)
    .single();

  if (!membership) return { error: "Membership not found" };

  if (!(await checkHasAccountPermission(membership.account_id, "account.manage_members"))) {
    return { error: "Permission denied" };
  }

  const { error } = await supabase
    .from("account_membership_permissions")
    .delete()
    .eq("membership_id", membershipId)
    .eq("permission_key", permissionKey);

  if (error) return { error: error.message };

  return { data: true };
}
