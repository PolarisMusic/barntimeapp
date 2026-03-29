"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  updateMemberRole,
  removeMember,
  addPermission,
  removePermission,
} from "@/lib/actions/accounts";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";

const ALL_PERMISSIONS = [
  "account.manage_members",
  "account.manage_contacts",
  "event.create",
  "event.view_owned",
  "event.edit_owned",
  "event.link_participants",
  "event.manage_schedule",
  "event.manage_services",
  "event.manage_documents",
  "event.manage_contacts",
  "vendor.confirm",
  "event.view_participant",
];

// Must match get_default_permissions() in SQL
const ROLE_DEFAULTS: Record<string, string[]> = {
  account_owner: [
    "account.manage_members",
    "account.manage_contacts",
    "event.create",
    "event.view_owned",
    "event.edit_owned",
    "event.link_participants",
    "event.manage_schedule",
    "event.manage_services",
    "event.manage_documents",
    "event.manage_contacts",
    "vendor.confirm",
    "event.view_participant",
  ],
  account_manager: [
    "account.manage_contacts",
    "event.create",
    "event.view_owned",
    "event.edit_owned",
    "event.link_participants",
    "event.manage_schedule",
    "event.manage_services",
    "event.manage_documents",
    "event.manage_contacts",
    "vendor.confirm",
    "event.view_participant",
  ],
  event_coordinator: [
    "event.view_owned",
    "event.edit_owned",
    "event.manage_schedule",
    "event.manage_services",
    "event.manage_documents",
    "event.manage_contacts",
    "event.view_participant",
  ],
  viewer: ["event.view_owned", "event.view_participant"],
};

type MemberRowProps = {
  membership: {
    id: string;
    account_id: string;
    account_role: string;
  };
  profile: {
    id: string;
    email: string;
    full_name: string | null;
  };
  permissions: { id: string; permission_key: string }[];
};

export function MemberRow({ membership, profile, permissions }: MemberRowProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showPerms, setShowPerms] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [role, setRole] = useState(membership.account_role);
  // Explicit overrides (stored in DB)
  const [explicitPerms, setExplicitPerms] = useState(
    permissions.map((p) => p.permission_key)
  );

  const roleDefaults = useMemo(() => ROLE_DEFAULTS[role] || [], [role]);

  async function handleRoleChange(formData: FormData) {
    const newRole = formData.get("account_role") as string;
    setRole(newRole);
    await updateMemberRole(membership.id, formData);
  }

  async function handleRemove() {
    const result = await removeMember(membership.id);
    if (result?.error) {
      toast(result.error, "error");
    } else {
      router.refresh();
    }
  }

  async function togglePermission(key: string) {
    const isRoleDefault = roleDefaults.includes(key);
    const isExplicit = explicitPerms.includes(key);

    if (isRoleDefault) {
      // Role defaults can't be toggled — they come from the role
      return;
    }

    if (isExplicit) {
      await removePermission(membership.id, key);
      setExplicitPerms(explicitPerms.filter((p) => p !== key));
    } else {
      await addPermission(membership.id, key);
      setExplicitPerms([...explicitPerms, key]);
    }
  }

  function isEffective(key: string) {
    return roleDefaults.includes(key) || explicitPerms.includes(key);
  }

  return (
    <div className="p-4">
      <ConfirmDialog
        open={confirmOpen}
        title="Remove Member"
        message={`Remove ${profile.email} from this account?`}
        confirmLabel="Remove"
        onConfirm={async () => { await handleRemove(); setConfirmOpen(false); }}
        onCancel={() => setConfirmOpen(false)}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{profile.email}</p>
          {profile.full_name && (
            <p className="text-xs text-gray-500">{profile.full_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <form action={handleRoleChange}>
            <select
              name="account_role"
              defaultValue={membership.account_role}
              onChange={(e) => e.target.form?.requestSubmit()}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
            >
              <option value="viewer">Viewer</option>
              <option value="event_coordinator">Event Coordinator</option>
              <option value="account_manager">Account Manager</option>
              <option value="account_owner">Account Owner</option>
            </select>
          </form>
          <button
            onClick={() => setShowPerms(!showPerms)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
          >
            Permissions
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      </div>

      {showPerms && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-gray-400">
            Checked = effective. Gray background = role default (cannot remove). White = explicit override (can toggle).
          </p>
          <div className="grid grid-cols-3 gap-2">
            {ALL_PERMISSIONS.map((key) => {
              const isDefault = roleDefaults.includes(key);
              const effective = isEffective(key);
              return (
                <label
                  key={key}
                  className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs ${
                    isDefault
                      ? "bg-gray-100 text-gray-500"
                      : "text-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={effective}
                    disabled={isDefault}
                    onChange={() => togglePermission(key)}
                    className="rounded border-gray-300"
                  />
                  {key}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
