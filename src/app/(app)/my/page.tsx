import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getMyTickets } from "@/lib/actions/tickets";

export const dynamic = "force-dynamic";

function formatDate(d: string | null) {
  if (!d) return "Date TBA";
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPrice(cents: number) {
  if (!cents) return "Free";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default async function MyPage() {
  const profile = await requireProfile();
  const supabase = await createServiceClient();

  const [tickets, membershipsResult] = await Promise.all([
    getMyTickets(),
    supabase
      .from("account_memberships")
      .select("account_id")
      .eq("profile_id", profile.id),
  ]);

  const isOrganizer = (membershipsResult.data?.length ?? 0) > 0;
  const isStaff =
    profile.platform_role === "platform_admin" ||
    profile.platform_role === "staff";

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">My Events</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tickets you&apos;ve purchased.
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">You don&apos;t have any tickets yet.</p>
          <Link
            href="/events"
            className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Browse public events →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/my/tickets/${t.id}`}
              className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:border-blue-300 hover:shadow-sm"
            >
              <div
                className="h-16 w-16 flex-shrink-0 rounded-md bg-gray-100 bg-cover bg-center"
                style={
                  t.hero_image_url
                    ? { backgroundImage: `url(${t.hero_image_url})` }
                    : undefined
                }
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900">
                  {t.event_name}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDate(t.event_start)} · Seat #{t.serial_number}
                </p>
              </div>
              <div className="text-right text-sm">
                <p
                  className={`font-medium ${
                    t.status === "paid"
                      ? "text-green-700"
                      : t.status === "refunded"
                        ? "text-gray-500"
                        : "text-amber-700"
                  }`}
                >
                  {t.status}
                </p>
                <p className="text-xs text-gray-400">
                  {formatPrice(t.unit_price_cents)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {(isOrganizer || isStaff) && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Organizer
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Manage events and clients you produce.
          </p>
          <Link
            href="/portal/events"
            className="mt-3 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Open Organizer Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
