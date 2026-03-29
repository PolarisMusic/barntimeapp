const roleLabels: Record<string, string> = {
  account_owner: "Owner",
  account_manager: "Manager",
  event_coordinator: "Coordinator",
  viewer: "Viewer",
};

const ownerColors = "bg-blue-50 text-blue-700";
const participantColors = "bg-purple-50 text-purple-700";

export function RoleBadge({
  role,
  isOwner,
}: {
  role: string;
  isOwner: boolean;
}) {
  if (!isOwner) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${participantColors}`}
      >
        Participant
      </span>
    );
  }

  const label = roleLabels[role] || role;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ownerColors}`}
    >
      {label}
    </span>
  );
}
