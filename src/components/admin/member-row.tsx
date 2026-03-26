"use client";

import { useState } from "react";
import {
  updateMemberRole,
  removeMember,
  addPermission,
  removePermission,
} from "@/lib/actions/accounts";
import { FormButton } from "@/components/ui/form-button";

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
  const [showPerms, setShowPerms] = useState(false);
  const [perms, setPerms] = useState(permissions.map((p) => p.permission_key));

  async function handleRoleChange(formData: FormData) {
    await updateMemberRole(membership.id, formData);
  }

  async function handleRemove() {
    if (confirm("Remove this member?")) {
      await removeMember(membership.id);
    }
  }

  async function togglePermission(key: string) {
    if (perms.includes(key)) {
      await removePermission(membership.id, key);
      setPerms(perms.filter((p) => p !== key));
    } else {
      await addPermission(membership.id, key);
      setPerms([...perms, key]);
    }
  }

  return (
    <div className="p-4">
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
            onClick={handleRemove}
            className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      </div>

      {showPerms && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {ALL_PERMISSIONS.map((key) => (
            <label
              key={key}
              className="flex items-center gap-1.5 text-xs text-gray-600"
            >
              <input
                type="checkbox"
                checked={perms.includes(key)}
                onChange={() => togglePermission(key)}
                className="rounded border-gray-300"
              />
              {key}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
