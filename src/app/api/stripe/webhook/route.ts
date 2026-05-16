import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { appUrl, getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/actions/activity-log";
import {
  sendTransactionalEmail,
  ticketConfirmationEmail,
} from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const ticketIdsRaw = session.metadata?.ticket_ids;
  if (!ticketIdsRaw) {
    return NextResponse.json({ received: true, note: "no ticket_ids" });
  }
  const ticketIds = ticketIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || session.id;

  const supabase = await createServiceClient();

  let finalized = 0;
  for (const ticketId of ticketIds) {
    const { error } = await supabase.rpc("finalize_ticket", {
      p_ticket_id: ticketId,
      p_payment_intent: paymentIntentId,
    });
    if (error) {
      // Log + continue so a single bad row doesn't block the rest.
      console.error("finalize_ticket failed", { ticketId, error: error.message });
      continue;
    }
    finalized++;
  }

  const eventId = session.metadata?.event_id;
  const profileId = session.metadata?.profile_id || null;
  if (eventId) {
    await logActivity({
      actorId: profileId,
      entityType: "event",
      entityId: eventId,
      action: "ticket.paid",
      summary: `Finalized ${finalized}/${ticketIds.length} ticket(s)`,
      metadata: {
        sessionId: session.id,
        paymentIntent: paymentIntentId,
        ticketIds,
      },
    });
  }

  // Best-effort confirmation email. Failures here must not fail the webhook
  // (Stripe would retry the whole thing).
  try {
    if (finalized > 0) {
      await sendConfirmation({
        session,
        ticketIds,
        eventId: eventId ?? null,
      });
    }
  } catch (err) {
    console.error("ticket confirmation email failed", err);
  }

  return NextResponse.json({ received: true, finalized });
}

async function sendConfirmation({
  session,
  ticketIds,
  eventId,
}: {
  session: Stripe.Checkout.Session;
  ticketIds: string[];
  eventId: string | null;
}) {
  const to = session.customer_details?.email || session.customer_email;
  if (!to || !eventId) return;

  const supabase = await createServiceClient();

  const { data: event } = await supabase
    .from("events")
    .select("name, public_slug, start_date, ticket_capacity")
    .eq("id", eventId)
    .maybeSingle();
  if (!event || !event.public_slug) return;

  const { data: rows } = await supabase
    .from("tickets")
    .select("serial_number")
    .in("id", ticketIds)
    .eq("status", "paid")
    .order("serial_number");

  const cap = event.ticket_capacity;
  const seatLines = (rows || []).map((r) =>
    cap ? `Seat #${r.serial_number} of ${cap}` : `Seat #${r.serial_number}`
  );
  if (seatLines.length === 0) return;

  const email = ticketConfirmationEmail({
    eventName: event.name,
    eventStart: event.start_date,
    seatLines,
    eventUrl: `${appUrl()}/events/${event.public_slug}`,
    myTicketsUrl: `${appUrl()}/my`,
  });

  await sendTransactionalEmail({ to, ...email });
}
