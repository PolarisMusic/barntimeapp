const statusConfig: Record<string, { label: string; colors: string }> = {
  // Event statuses
  draft: { label: "Draft", colors: "bg-gray-100 text-gray-600" },
  active: { label: "Active", colors: "bg-green-100 text-green-700" },
  finalized: { label: "Finalized", colors: "bg-blue-100 text-blue-700" },
  archived: { label: "Archived", colors: "bg-gray-100 text-gray-500" },
  // Service statuses
  pending: { label: "Pending", colors: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmed", colors: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", colors: "bg-red-100 text-red-700" },
  // Account statuses
  inactive: { label: "Inactive", colors: "bg-gray-100 text-gray-500" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config?.colors || "bg-gray-100 text-gray-600"}`}
    >
      {config?.label || status}
    </span>
  );
}
