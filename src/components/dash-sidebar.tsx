"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

type Item = { href: string; label: string; soon?: boolean };
type Group = { heading: string; items: Item[] };

const groups: Group[] = [
  {
    heading: "",
    items: [{ href: "/dashboard", label: "Dashboard" }],
  },
  {
    heading: "Collect",
    items: [
      { href: "/dashboard/domains", label: "Domains" },
      { href: "/dashboard/youtube", label: "YouTube", soon: true },
      { href: "/dashboard/lp-links", label: "LP Links", soon: true },
    ],
  },
  {
    heading: "Send",
    items: [
      { href: "/dashboard/campaigns", label: "Campaigns" },
      { href: "/dashboard/campaigns/new", label: "Create Campaign" },
      { href: "/dashboard/templates", label: "Templates" },
      { href: "/dashboard/automation", label: "Automation" },
    ],
  },
  {
    heading: "Analyze",
    items: [{ href: "/dashboard/statistics", label: "Statistics" }],
  },
  {
    heading: "Manage",
    items: [
      { href: "/dashboard/status", label: "Server Status" },
      { href: "/dashboard/settings", label: "Settings", soon: true },
    ],
  },
];

export function DashSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-zinc-950 text-zinc-200 min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-zinc-800 flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600" />
        <span className="font-semibold tracking-tight">push-panel</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {groups.map((g, i) => (
          <div key={i} className="px-3 mb-4">
            {g.heading && (
              <p className="px-2 mb-1 text-[10px] uppercase tracking-widest text-zinc-500">
                {g.heading}
              </p>
            )}
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active =
                  it.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === it.href || pathname.startsWith(it.href + "/");
                if (it.soon) {
                  return (
                    <li key={it.href}>
                      <span className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-zinc-600 cursor-not-allowed">
                        {it.label}
                        <span className="text-[9px] uppercase tracking-wide bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                          soon
                        </span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? "bg-indigo-600 text-white"
                          : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      }`}
                    >
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <form action="/api/logout" method="POST" className="p-3 border-t border-zinc-800">
        <button
          type="submit"
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          Log out
        </button>
      </form>
    </aside>
  );
}
