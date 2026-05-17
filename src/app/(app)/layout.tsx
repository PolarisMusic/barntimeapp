import Link from "next/link";
import { getUser } from "@/lib/auth";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { AppTabs } from "@/components/app/app-tabs";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/videos" className="text-lg font-bold text-blue-600">
            Barn Time
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden text-sm text-gray-500 sm:inline">
                  {user.email}
                </span>
                <SignOutButton />
              </>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
        <AppTabs signedIn={!!user} />
      </header>
      <main>{children}</main>
    </div>
  );
}
