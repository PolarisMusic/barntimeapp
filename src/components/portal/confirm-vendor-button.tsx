"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmVendor } from "@/lib/actions/events";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";

export function PortalConfirmVendorButton({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleConfirm() {
    const result = await confirmVendor(serviceId);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Vendor confirmed", "success");
      router.refresh();
    }
  }

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Vendor"
        message="Confirm this vendor for the event?"
        confirmLabel="Confirm"
        variant="default"
        onConfirm={async () => {
          await handleConfirm();
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
      <button
        onClick={() => setConfirmOpen(true)}
        className="rounded-md border border-green-200 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
      >
        Confirm Vendor
      </button>
    </>
  );
}
