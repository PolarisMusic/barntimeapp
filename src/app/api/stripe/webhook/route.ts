import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/actions/activity-log";

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

  return NextResponse.json({ received: true, finalized });
}
