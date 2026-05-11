import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getRevealedAddress } from "@/lib/address-reveal";
import { RevealCountdown } from "@/components/app/reveal-countdown";

export const dynamic = "force-dynamic";

function formatDate(d: string | null) {
  if (!d) return "Date TBA";
  return new Date(d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatPrice(cents: number) {
  if (!cents) return "Free";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "id, serial_number, kind, status, paid_at, unit_price_cents, issuance_hash, event_id"
    )
    .eq("id", id)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!ticket) notFound();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, public_slug, start_date, hero_image_url, address_reveal_at, public_address, ticket_capacity"
    )
    .eq("id", ticket.event_id)
    .single();

  if (!event) notFound();

  const reveal = await getRevealedAddress(
    {
      id: event.id,
      address_reveal_at: event.address_reveal_at,
      public_address: event.public_address,
    },
    profile.id
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/my"
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← My tickets
      </Link>

      <div
        className="mt-4 aspect-[16/9] w-full overflow-hidden rounded-lg bg-gray-100 bg-cover bg-center"
        style={
          event.hero_image_url
            ? { backgroundImage: `url(${event.hero_image_url})` }
            : undefined
        }
      />

      <h1 className="mt-6 text-3xl font-bold leading-tight">{event.name}</h1>
      <p className="mt-1 text-gray-500">{formatDate(event.start_date)}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Seat
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            #{ticket.serial_number}
            {event.ticket_capacity ? (
              <span className="ml-1 text-base font-normal text-gray-400">
                / {event.ticket_capacity}
              </span>
            ) : null}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Status
          </p>
          <p
            className={`mt-1 text-2xl font-bold capitalize ${
              ticket.status === "paid"
                ? "text-green-700"
                : ticket.status === "refunded"
                  ? "text-gray-500"
                  : "text-amber-700"
            }`}
          >
            {ticket.status}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {formatPrice(ticket.unit_price_cents)} · {ticket.kind}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Location
        </h2>
        {reveal.revealed ? (
          <p className="mt-2 whitespace-pre-line text-gray-900">
            {reveal.address}
          </p>
        ) : reveal.revealAt ? (
          <div className="mt-2">
            <RevealCountdown revealAt={reveal.revealAt} />
          </div>
        ) : (
          <p className="mt-2 text-gray-700">
            Address revealed close to the event.
          </p>
        )}
      </div>

      {ticket.issuance_hash && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Certificate
          </h2>
          <p className="mt-2 break-all font-mono text-xs text-gray-500">
            {ticket.issuance_hash}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            This hash uniquely identifies your seat. If we ever issue this
            ticket on-chain, the mint will reference exactly this record.
          </p>
        </div>
      )}

      {event.public_slug && (
        <div className="mt-6">
          <Link
            href={`/events/${event.public_slug}`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View public event page →
          </Link>
        </div>
      )}
    </div>
  );
}
