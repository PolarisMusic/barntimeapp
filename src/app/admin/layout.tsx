import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { SignOutButton } from "@/components/ui/sign-out-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-bold text-blue-600">
              Barn Time Admin
            </Link>
            <Link
              href="/admin/accounts"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Accounts
            </Link>
            <Link
              href="/admin/events"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Events
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/portal/events"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Client Portal
            </Link>
            <span className="text-sm text-gray-400">{profile.email}</span>
            <SignOutButton />
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
