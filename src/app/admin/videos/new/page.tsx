import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { VideoForm } from "@/components/admin/video-form";

export default async function NewVideoPage() {
  await requireAdmin();
  const supabase = await createServiceClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, name")
    .order("name");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">New Video</h1>
      <VideoForm events={events || []} />
    </div>
  );
}
