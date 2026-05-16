import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function PublicTicketCertificatePage({
  params,
}: {
  params: Promise<{ slug: string; serial: string }>;
}) {
  const { slug, serial } = await params;
  const serialNumber = parseInt(serial, 10);
  if (!Number.isFinite(serialNumber) || serialNumber < 1) {
    notFound();
  }

  const supabase = await createServiceClient();

  const { data: cert } = await supabase
    .from("public_ticket_certificates")
    .select("*")
    .eq("event_slug", slug)
    .eq("serial_number", serialNumber)
    .maybeSingle();

  if (!cert || !cert.ticket_id) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("name, start_date, hero_image_url, ticket_capacity")
    .eq("public_slug", slug)
    .maybeSingle();

  const minted = !!cert.minted_at;
  const eventName = cert.event_name ?? event?.name ?? "Event";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/events/${slug}`}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← {eventName}
      </Link>

      <div
        className="mt-4 aspect-[16/9] w-full overflow-hidden rounded-lg bg-gray-100 bg-cover bg-center"
        style={
          event?.hero_image_url
            ? { backgroundImage: `url(${event.hero_image_url})` }
            : undefined
        }
      />

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Barntime Certificate
        </p>
        <h1 className="mt-1 text-3xl font-bold leading-tight">
          {eventName}
        </h1>
        <p className="mt-1 text-gray-500">
          Held seat #{cert.serial_number}
          {event?.ticket_capacity ? ` of ${event.ticket_capacity}` : ""} · {cert.kind}
        </p>
        {event?.start_date && (
          <p className="mt-1 text-sm text-gray-500">
            {new Date(event.start_date).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Issuance hash
        </h2>
        <p className="mt-2 break-all font-mono text-xs text-gray-700">
          {cert.issuance_hash}
        </p>
        <p className="mt-2 text-xs text-gray-400">
          sha256 of (event id, serial, holder id, kind, paid_at). The chain
          layer, when it ships, will mint exactly this record.
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          On-chain status
        </h2>
        {minted ? (
          <dl className="mt-2 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-gray-400">Minted</dt>
              <dd className="font-medium">{formatDate(cert.minted_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Chain</dt>
              <dd className="font-medium">{cert.chain_id ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Token ID</dt>
              <dd className="font-medium tabular-nums">
                {cert.token_id ?? "—"}
              </dd>
            </div>
            <div className="col-span-3">
              <dt className="text-xs text-gray-400">Contract</dt>
              <dd className="break-all font-mono text-xs">
                {cert.contract_address ?? "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-gray-600">
            Not minted yet. The certificate above is the authoritative
            pre-mint record.
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <a
          href={`${appUrl()}/api/tickets/${cert.ticket_id}/certificate`}
          className="text-blue-600 hover:text-blue-800"
        >
          Verification JSON →
        </a>
        <a
          href={`${appUrl()}/api/tickets/${cert.ticket_id}/metadata`}
          className="text-blue-600 hover:text-blue-800"
        >
          ERC-721 metadata →
        </a>
      </div>
    </div>
  );
}
