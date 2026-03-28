"use client";

import { updateServiceNotes } from "@/lib/actions/events";
import { InlineEditField } from "./inline-edit-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { PortalConfirmVendorButton } from "./confirm-vendor-button";

export function EditableServiceItem({
  service,
  canEditNotes,
  canConfirm,
}: {
  service: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    accountName: string | null;
  };
  canEditNotes: boolean;
  canConfirm: boolean;
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{service.name}</p>
          <p className="text-xs text-gray-500">
            {service.accountName || "No vendor assigned"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={service.status} />
          {canConfirm && service.status === "pending" && service.accountName && (
            <PortalConfirmVendorButton serviceId={service.id} />
          )}
        </div>
      </div>
      <div className="mt-1.5">
        {canEditNotes ? (
          <InlineEditField
            value={service.description || ""}
            placeholder="Add notes..."
            multiline
            onSave={async (newValue) => {
              return await updateServiceNotes(service.id, newValue);
            }}
          />
        ) : (
          service.description && (
            <p className="text-sm text-gray-600">{service.description}</p>
          )
        )}
      </div>
    </div>
  );
}
