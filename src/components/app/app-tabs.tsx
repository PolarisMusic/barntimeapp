"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/videos", label: "Videos" },
  { href: "/events", label: "Public Events" },
  { href: "/my", label: "My Events" },
] as const;

export function AppTabs({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-5xl gap-1 px-4 pb-1 text-sm">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const href =
          tab.href === "/my" && !signedIn
            ? `/auth/login?next=${encodeURIComponent("/my")}`
            : tab.href;
        return (
          <Link
            key={tab.href}
            href={href}
            className={`border-b-2 px-3 py-2 font-medium transition-colors ${
              active
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
