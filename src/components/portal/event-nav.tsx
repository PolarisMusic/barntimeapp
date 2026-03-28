"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
  count?: number;
};

export function EventNav({
  tabs,
  eventId,
}: {
  tabs: Tab[];
  eventId: string;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    // Overview: exact match
    if (href === `/portal/events/${eventId}`) {
      return pathname === href;
    }
    // Sub-pages: starts with
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex gap-1 border-b border-gray-200">
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-1.5 text-xs ${
                  active ? "text-blue-400" : "text-gray-300"
                }`}
              >
                {tab.count}
              </span>
            )}
            {active && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
