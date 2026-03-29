"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteScheduleItem } from "@/lib/actions/events";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";

type ScheduleItem = {
  id: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  description: string | null;
  sort_order: number;
};

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ScheduleItemRow({ item }: { item: ScheduleItem }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    const result = await deleteScheduleItem(item.id);
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
        title="Delete Schedule Item"
        message={`Delete "${item.title}"?`}
        confirmLabel="Delete"
        onConfirm={async () => { await handleDelete(); setConfirmOpen(false); }}
        onCancel={() => setConfirmOpen(false)}
      />
      <div>
        <p className="text-sm font-medium">{item.title}</p>
        <p className="text-xs text-gray-500">
          {formatTime(item.start_time)} — {formatTime(item.end_time)}
          {item.location_name && ` @ ${item.location_name}`}
        </p>
        {item.description && <p className="mt-1 text-xs text-gray-400">{item.description}</p>}
      </div>
      <button onClick={() => setConfirmOpen(true)} className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
        Delete
      </button>
    </div>
  );
}
