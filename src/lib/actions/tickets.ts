"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { appUrl, getStripe } from "@/lib/stripe";
import { logActivity } from "./activity-log";

const MAX_TICKETS_PER_CHECKOUT = 6;

export async function createCheckoutSession(
  eventId: string,
  quantity: number
): Promise<{ url: string } | { error: string }> {
  const profile = await requireProfile();

  if (!Number.isInteger(quantity) || quantity < 1) {
    return { error: "Quantity must be at least 1" };
  }
  if (quantity > MAX_TICKETS_PER_CHECKOUT) {
    return { error: `Maximum ${MAX_TICKETS_PER_CHECKOUT} tickets per order` };
  }

  const supabase = await createServiceClient();

  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select(
      "id, name, is_public, status, ticketing_enabled, ticket_price_cents, ticket_capacity, public_slug, hero_image_url"
    )
    .eq("id", eventId)
    .maybeSingle();

  if (eventErr) return { error: eventErr.message };
  if (!event) return { error: "Event not found" };
  if (!event.is_public || !["active", "finalized"].includes(event.status)) {
    return { error: "Event is not on sale" };
  }
  if (!event.ticketing_enabled) {
    return { error: "Ticketing is not enabled for this event" };
  }
  if (event.ticket_price_cents == null || event.ticket_price_cents <= 0) {
    return { error: "Ticket price is not configured" };
  }
  if (!event.public_slug) {
    return { error: "Event is missing a public slug" };
  }

  // Allocate one row per seat via the SECURITY DEFINER function.
  const ticketIds: string[] = [];
  for (let i = 0; i < quantity; i++) {
    const { data: ticket, error: issueErr } = await supabase.rpc("issue_ticket", {
      p_event_id: eventId,
      p_profile_id: profile.id,
      p_kind: "attendee",
    });
    if (issueErr || !ticket) {
      const msg = issueErr?.message || "Could not issue ticket";
      // Roll back any pending rows we already allocated for this attempt.
      if (ticketIds.length > 0) {
        await supabase
          .from("tickets")
          .update({ status: "cancelled" })
          .in("id", ticketIds);
      }
      const isSoldOut = msg.toLowerCase().includes("sold out");
      return { error: isSoldOut ? "Sold out" : msg };
    }
    ticketIds.push(ticket.id);
  }

  const stripe = getStripe();
  const successUrl = `${appUrl()}/events/${event.public_slug}/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl()}/events/${event.public_slug}`;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: profile.email,
      client_reference_id: ticketIds[0],
      line_items: [
        {
          quantity,
          price_data: {
            currency: "usd",
            unit_amount: event.ticket_price_cents,
            product_data: {
              name: `${event.name} — ticket`,
              ...(event.hero_image_url ? { images: [event.hero_image_url] } : {}),
            },
          },
        },
      ],
      metadata: {
        ticket_ids: ticketIds.join(","),
        event_id: eventId,
        profile_id: profile.id,
      },
      payment_intent_data: {
        metadata: {
          ticket_ids: ticketIds.join(","),
          event_id: eventId,
          profile_id: profile.id,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  } catch (err) {
    // Couldn't create a session — release the pending rows.
    await supabase
      .from("tickets")
      .update({ status: "cancelled" })
      .in("id", ticketIds);
    const message = err instanceof Error ? err.message : "Stripe error";
    return { error: message };
  }

  if (!session.url) {
    await supabase
      .from("tickets")
      .update({ status: "cancelled" })
      .in("id", ticketIds);
    return { error: "Stripe did not return a checkout URL" };
  }

  await supabase
    .from("tickets")
    .update({ stripe_checkout_session_id: session.id })
    .in("id", ticketIds);

  await logActivity({
    actorId: profile.id,
    entityType: "event",
    entityId: eventId,
    action: "ticket.checkout_started",
    summary: `Started checkout for ${quantity} ticket(s)`,
    metadata: { ticketIds, sessionId: session.id },
  });

  return { url: session.url };
}

export type MyTicket = {
  id: string;
  serial_number: number;
  kind: string;
  status: string;
  paid_at: string | null;
  unit_price_cents: number;
  event_id: string;
  event_name: string;
  event_slug: string | null;
  event_start: string | null;
  hero_image_url: string | null;
};

export async function getMyTickets(): Promise<MyTicket[]> {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from("tickets")
    .select(
      "id, serial_number, kind, status, paid_at, unit_price_cents, event_id, events(name, public_slug, start_date, hero_image_url)"
    )
    .eq("profile_id", profile.id)
    .in("status", ["paid", "refunded"])
    .order("paid_at", { ascending: false, nullsFirst: false });

  return (data || []).map((row) => {
    const event = row.events as unknown as {
      name: string | null;
      public_slug: string | null;
      start_date: string | null;
      hero_image_url: string | null;
    } | null;
    return {
      id: row.id,
      serial_number: row.serial_number,
      kind: row.kind,
      status: row.status,
      paid_at: row.paid_at,
      unit_price_cents: row.unit_price_cents,
      event_id: row.event_id,
      event_name: event?.name ?? "Event",
      event_slug: event?.public_slug ?? null,
      event_start: event?.start_date ?? null,
      hero_image_url: event?.hero_image_url ?? null,
    };
  });
}

/**
 * Admin-only stub. Wired in v1 so there is one canonical place to record an
 * on-chain mint when the future minter service ships. Not exposed in any UI.
 */
export async function recordMint(
  ticketId: string,
  params: {
    chain_id: number;
    contract_address: string;
    token_id: string; // decimal string; stored numerically by Postgres
    mint_tx_hash: string;
  }
) {
  const profile = await requireAdmin();
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("tickets")
    .update({
      chain_id: params.chain_id,
      contract_address: params.contract_address,
      token_id: Number(params.token_id),
      mint_tx_hash: params.mint_tx_hash,
      minted_at: new Date().toISOString(),
    })
    .eq("id", ticketId)
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    actorId: profile.id,
    entityType: "ticket",
    entityId: ticketId,
    action: "ticket.minted",
    summary: `Recorded on-chain mint for ticket #${data.serial_number}`,
    metadata: params,
  });

  return { data };
}
