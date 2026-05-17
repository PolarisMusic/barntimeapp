import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ERC-721 metadata for a paid ticket. Cached for a long time because the
// payload is deterministic per ticket (`metadata_json` is stamped at the
// moment of finalization and never mutated thereafter).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "id, status, metadata_json, serial_number, kind, event_id, events(name, public_slug, public_summary, description, hero_image_url, start_date)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!ticket || ticket.status !== "paid") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const event = ticket.events as unknown as {
    name: string | null;
    public_slug: string | null;
    public_summary: string | null;
    description: string | null;
    hero_image_url: string | null;
    start_date: string | null;
  } | null;

  // metadata_json is the authoritative payload (it's what would be pinned to
  // IPFS at mint time). Rewrite external_url to be absolute and fall back to
  // a freshly rendered payload if for any reason the column is empty.
  const eventSlug = event?.public_slug ?? null;
  const eventName = event?.name ?? "Barntime";
  const fallback = {
    name: `Barntime — ${eventName} #${ticket.serial_number}`,
    description: event?.public_summary ?? event?.description ?? "",
    image: event?.hero_image_url ?? "",
    external_url: eventSlug ? `${appUrl()}/events/${eventSlug}` : appUrl(),
    attributes: [
      { trait_type: "Event", value: eventName },
      { trait_type: "Date", value: event?.start_date ?? "" },
      { trait_type: "Serial", value: String(ticket.serial_number) },
      { trait_type: "Kind", value: ticket.kind },
    ],
  };

  let body: Record<string, unknown>;
  if (ticket.metadata_json && typeof ticket.metadata_json === "object") {
    body = { ...(ticket.metadata_json as Record<string, unknown>) };
    if (typeof body.external_url === "string" && body.external_url.startsWith("/")) {
      body.external_url = `${appUrl()}${body.external_url}`;
    }
  } else {
    body = fallback;
  }

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
