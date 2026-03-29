"use client";

import { updateScheduleItemNotes } from "@/lib/actions/events";
import { InlineEditField } from "./inline-edit-field";

export function EditableScheduleItem({
  item,
  canEdit,
}: {
  item: {
    id: string;
    title: string;
    start_time: string | null;
    end_time: string | null;
    description: string | null;
    locationName: string | null;
  };
  canEdit: boolean;
}) {
  function formatTime(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="p-4">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium">{item.title}</p>
        {item.locationName && (
          <span className="text-xs text-gray-400">@ {item.locationName}</span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-gray-500">
        {formatTime(item.start_time)} — {formatTime(item.end_time)}
      </p>
      <div className="mt-1.5">
        {canEdit ? (
          <InlineEditField
            value={item.description || ""}
            placeholder="Add notes..."
            multiline
            onSave={async (newValue) => {
              return await updateScheduleItemNotes(item.id, newValue);
            }}
          />
        ) : (
          item.description && (
            <p className="text-sm text-gray-600">{item.description}</p>
          )
        )}
      </div>
    </div>
  );
}
