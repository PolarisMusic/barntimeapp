import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { SignOutButton } from "@/components/ui/sign-out-button";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const isAdmin =
    profile.platform_role === "platform_admin" ||
    profile.platform_role === "staff";

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/portal/events"
              className="text-lg font-bold text-blue-600"
            >
              Barn Time
            </Link>
            <Link
              href="/portal/events"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              My Events
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Admin
              </Link>
            )}
            <span className="text-sm text-gray-400">{profile.email}</span>
            <SignOutButton />
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
