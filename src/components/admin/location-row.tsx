"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteLocation } from "@/lib/actions/events";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";

type Location = {
  id: string;
  name: string;
  address: string | null;
  location_type: string | null;
  map_url: string | null;
  notes: string | null;
};

export function LocationRow({ location }: { location: Location }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    const result = await deleteLocation(location.id);
    if (result?.error) {
      toast(result.error, "error");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex items-center justify-between p-4">
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Location"
        message={`Delete location "${location.name}"?`}
        confirmLabel="Delete"
        onConfirm={() => { setConfirmOpen(false); handleDelete(); }}
        onCancel={() => setConfirmOpen(false)}
      />
      <div>
        <p className="text-sm font-medium">
          {location.name}
          {location.location_type && (
            <span className="ml-2 text-xs text-gray-400">({location.location_type})</span>
          )}
        </p>
        <p className="text-xs text-gray-500">
          {location.address || "No address"}
          {location.notes ? ` — ${location.notes}` : ""}
        </p>
        {location.map_url && (
          <a
            href={location.map_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            View Map
          </a>
        )}
      </div>
      <button onClick={() => setConfirmOpen(true)} className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
        Delete
      </button>
    </div>
  );
}
