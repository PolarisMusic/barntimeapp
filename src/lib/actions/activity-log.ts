"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function logActivity(params: {
  actorId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  details?: Record<string, unknown>;
}) {
  const supabase = await createServiceClient();
  await supabase.from("activity_log").insert({
    actor_id: params.actorId,
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    summary: params.summary ?? null,
    metadata: params.metadata ?? null,
    details: params.details ?? null,
  });
}
