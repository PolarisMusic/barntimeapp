"use client";

import { confirmVendor } from "@/lib/actions/events";

export function PortalConfirmVendorButton({ serviceId }: { serviceId: string }) {
  async function handleConfirm() {
    if (confirm("Confirm this vendor?")) {
      const result = await confirmVendor(serviceId);
      if (result.error) {
        alert(result.error);
      }
    }
  }

  return (
    <button
      onClick={handleConfirm}
      className="rounded-md border border-green-200 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
    >
      Confirm Vendor
    </button>
  );
}
