"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/", icon: DashboardIcon },
  { label: "Leads", href: "/leads", icon: LeadsIcon },
  { label: "Methodology", href: "/methodology", icon: MethodologyIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 bg-ws-white border-r border-gray-10 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-10">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-dune tracking-tight">
          Lead Intelligence
        </h1>
        <p className="text-xs text-gray-50 mt-0.5">Wealthsimple Advisors</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm font-medium transition-colors ${
                isActive
                  ? "bg-cream text-dune border-l-2 border-ws-green"
                  : "text-gray-50 hover:bg-gray-05 hover:text-dune"
              }`}
            >
              <item.icon active={isActive} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-10">
        <p className="text-xs text-gray-30">AI-Powered Analysis</p>
        <p className="text-xs text-gray-30">v1.0 — Internal Tool</p>
      </div>
    </aside>
  );
}

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="7" height="7" rx="1.5" stroke={active ? "#00B47E" : "#807E7C"} strokeWidth="1.5" />
      <rect x="10" y="1" width="7" height="7" rx="1.5" stroke={active ? "#00B47E" : "#807E7C"} strokeWidth="1.5" />
      <rect x="1" y="10" width="7" height="7" rx="1.5" stroke={active ? "#00B47E" : "#807E7C"} strokeWidth="1.5" />
      <rect x="10" y="10" width="7" height="7" rx="1.5" stroke={active ? "#00B47E" : "#807E7C"} strokeWidth="1.5" />
    </svg>
  );
}

function LeadsIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="5" r="3.25" stroke={active ? "#00B47E" : "#807E7C"} strokeWidth="1.5" />
      <path d="M2 16C2 12.134 5.134 9 9 9C12.866 9 16 12.134 16 16" stroke={active ? "#00B47E" : "#807E7C"} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MethodologyIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="1.5" width="14" height="15" rx="2" stroke={active ? "#00B47E" : "#807E7C"} strokeWidth="1.5" />
      <path d="M5.5 6H12.5" stroke={active ? "#00B47E" : "#807E7C"} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5.5 9.5H12.5" stroke={active ? "#00B47E" : "#807E7C"} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5.5 13H9.5" stroke={active ? "#00B47E" : "#807E7C"} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
