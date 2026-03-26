import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { CreateEventForm } from "@/components/admin/create-event-form";

export default async function NewEventPage() {
  await requireAdmin();
  const supabase = await createServiceClient();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, type")
    .eq("status", "active")
    .order("name");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">New Event</h1>
      <CreateEventForm accounts={accounts || []} />
    </div>
  );
}
