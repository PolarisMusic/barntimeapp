import { createServiceClient } from "@/lib/supabase/server";

export type RevealResult =
  | { revealed: false; revealAt: string | null; reason: "not_time" | "no_ticket" | "no_address" }
  | { revealed: true; revealAt: string | null; address: string };

type EventLike = {
  id: string;
  address_reveal_at: string | null;
  public_address: string | null;
};

/**
 * Returns the public address only when:
 *   1. `address_reveal_at` is set and in the past,
 *   2. the caller holds a paid ticket for this event, and
 *   3. the event has a `public_address` set.
 * Otherwise returns enough info to render a "revealed at" countdown.
 *
 * Server-only. Uses the service-role client so the address can be read even
 * though the events RLS public policy doesn't expose private columns to anon.
 */
export async function getRevealedAddress(
  event: EventLike,
  profileId: string | null
): Promise<RevealResult> {
  const revealAt = event.address_reveal_at;

  if (!revealAt || new Date(revealAt).getTime() > Date.now()) {
    return { revealed: false, revealAt, reason: "not_time" };
  }
  if (!event.public_address) {
    return { revealed: false, revealAt, reason: "no_address" };
  }
  if (!profileId) {
    return { revealed: false, revealAt, reason: "no_ticket" };
  }

  const supabase = await createServiceClient();
  const { count } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("profile_id", profileId)
    .eq("status", "paid");

  if (!count || count < 1) {
    return { revealed: false, revealAt, reason: "no_ticket" };
  }

  return { revealed: true, revealAt, address: event.public_address };
}
