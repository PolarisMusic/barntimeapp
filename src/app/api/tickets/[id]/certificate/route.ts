import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public verification endpoint. Reads from the `public_ticket_certificates`
// view, which only exposes non-PII columns for paid tickets on public events.
// Anyone can hit this to prove a serial existed; buyer identity stays private.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: cert } = await supabase
    .from("public_ticket_certificates")
    .select("*")
    .eq("ticket_id", id)
    .maybeSingle();

  if (!cert) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(cert, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
