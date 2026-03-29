"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmVendor, deleteService } from "@/lib/actions/events";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";

type Service = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  vendor_name: string | null;
  confirmed_at: string | null;
};

export function ServiceRow({ service }: { service: Service }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleConfirm() {
    const result = await confirmVendor(service.id);
    if (result?.error) {
      toast(result.error, "error");
    } else {
      toast("Vendor confirmed", "success");
      router.refresh();
    }
  }

  async function handleDelete(): Promise<boolean> {
    const result = await deleteService(service.id);
    if (result?.error) {
      toast(result.error, "error");
      return false;
    } else {
      toast("Service deleted", "success");
      router.refresh();
      return true;
    }
  }

  return (
    <div className="flex items-center justify-between p-4">
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Service"
        message={`Delete service "${service.name}"?`}
        confirmLabel="Delete"
        onConfirm={async () => { const ok = await handleDelete(); if (ok) setConfirmOpen(false); }}
        onCancel={() => setConfirmOpen(false)}
      />
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
        <button onClick={() => setConfirmOpen(true)} className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
          Delete
        </button>
      </div>
    </div>
  );
}
