"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function addLinkableAccount(ownerAccountId: string, linkableAccountId: string) {
  await requireAdmin();
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("account_linkable_accounts")
    .insert({ owner_account_id: ownerAccountId, linkable_account_id: linkableAccountId });

  if (error) {
    if (error.code === "23505") return { error: "Account is already in the allowlist" };
    return { error: error.message };
  }

  revalidatePath(`/admin/accounts/${ownerAccountId}`);
  return { data: true };
}

export async function removeLinkableAccount(ownerAccountId: string, linkableAccountId: string) {
  await requireAdmin();
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("account_linkable_accounts")
    .delete()
    .eq("owner_account_id", ownerAccountId)
    .eq("linkable_account_id", linkableAccountId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/accounts/${ownerAccountId}`);
  return { data: true };
}

export async function getLinkableAllowlist(ownerAccountId: string) {
  await requireAdmin();
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from("account_linkable_accounts")
    .select("linkable_account_id, accounts!account_linkable_accounts_linkable_account_id_fkey(id, name, type)")
    .eq("owner_account_id", ownerAccountId);

  return (data || []).map((row) => {
    const acct = row.accounts as unknown as { id: string; name: string; type: string };
    return { id: acct.id, name: acct.name, type: acct.type };
  });
}

export async function getAllAccountsExcept(excludeId: string) {
  await requireAdmin();
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from("accounts")
    .select("id, name, type")
    .eq("status", "active")
    .neq("id", excludeId)
    .order("name");

  return data || [];
}
