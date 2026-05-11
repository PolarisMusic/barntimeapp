import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("account_memberships")
    .select("account_id, accounts(name)")
    .eq("profile_id", profile.id);

  const isOrganizer = (memberships?.length ?? 0) > 0;
  const isStaff =
    profile.platform_role === "platform_admin" ||
    profile.platform_role === "staff";

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">My Events</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tickets you&apos;ve purchased will appear here.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">You don&apos;t have any tickets yet.</p>
        <Link
          href="/events"
          className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Browse public events →
        </Link>
      </div>

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
