import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const profile = await requireProfile();

  const supabase = await createServiceClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, name, public_slug")
    .eq("public_slug", slug)
    .maybeSingle();

  if (!event) notFound();

  // Try to surface the tickets from this session. The webhook may not have
  // flipped them to paid yet — in that case we still show a friendly message.
  let tickets: { id: string; serial_number: number; status: string }[] = [];
  if (query.session_id) {
    const { data } = await supabase
      .from("tickets")
      .select("id, serial_number, status")
      .eq("stripe_checkout_session_id", query.session_id)
      .eq("profile_id", profile.id)
      .order("serial_number");
    tickets = data ?? [];
  }

  const paid = tickets.filter((t) => t.status === "paid");
  const stillPending = tickets.length > 0 && paid.length < tickets.length;

  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center">
      <h1 className="text-3xl font-bold">You&apos;re in! 🎉</h1>
      <p className="mt-3 text-gray-600">
        Thanks for buying tickets to{" "}
        <span className="font-medium text-gray-900">{event.name}</span>.
      </p>

      {paid.length > 0 && (
        <p className="mt-4 text-sm text-gray-500">
          Confirmed seats:{" "}
          {paid.map((t) => `#${t.serial_number}`).join(", ")}
        </p>
      )}

      {stillPending && (
        <p className="mt-3 text-sm text-amber-700">
          We&apos;re finalizing your seats — refresh in a moment if anything
          shows pending.
        </p>
      )}

      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/my"
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          View my tickets
        </Link>
        <Link
          href={`/events/${slug}`}
          className="rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to event
        </Link>
      </div>
    </div>
  );
}
