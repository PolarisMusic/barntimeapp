"use client";

import { confirmVendor, deleteService } from "@/lib/actions/events";
import { StatusBadge } from "@/components/ui/status-badge";

type Service = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  vendor_name: string | null;
  confirmed_at: string | null;
};

export function ServiceRow({ service }: { service: Service }) {
  async function handleConfirm() {
    await confirmVendor(service.id);
  }

  async function handleDelete() {
    if (confirm(`Delete service "${service.name}"?`)) {
      await deleteService(service.id);
    }
  }

  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <p className="text-sm font-medium">{service.name}</p>
        <p className="text-xs text-gray-500">
          {service.vendor_name || "No vendor"} | {service.description || "No description"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={service.status} />
        {service.status === "pending" && (
          <button onClick={handleConfirm} className="rounded-md border border-green-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50">
            Confirm
          </button>
        )}
        <button onClick={handleDelete} className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
          Delete
        </button>
      </div>
    </div>
  );
}
