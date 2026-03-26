import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { InviteMemberForm } from "@/components/admin/invite-member-form";
import { MemberRow } from "@/components/admin/member-row";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!account) notFound();

  const { data: members } = await supabase
    .from("account_memberships")
    .select(
      "*, profiles(id, email, full_name), account_membership_permissions(id, permission_key)"
    )
    .eq("account_id", id)
    .order("created_at");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/accounts/${id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; {account.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Members</h1>
      </div>

      <InviteMemberForm accountId={id} />

      <div className="rounded-lg border border-gray-200 bg-white">
        {members && members.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {members.map((m) => (
              <MemberRow
                key={m.id}
                membership={m}
                profile={m.profiles as unknown as { id: string; email: string; full_name: string | null }}
                permissions={
                  (m.account_membership_permissions as unknown as { id: string; permission_key: string }[]) || []
                }
              />
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-500">No members yet.</p>
        )}
      </div>
    </div>
  );
}
