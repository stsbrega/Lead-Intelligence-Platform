"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface SourceItem {
  label: string;
  source: string;
}

const INTERNAL_SOURCES: SourceItem[] = [
  { label: "Banking", source: "internal_banking" },
  { label: "Wealth Mgmt", source: "internal_wealth" },
  { label: "Pine", source: "internal_mortgage" },
];

const EXTERNAL_SOURCES: SourceItem[] = [
  { label: "Realty Partners", source: "external_realty" },
  { label: "Marketing Co.", source: "external_marketing" },
  { label: "Referrals", source: "external_referral" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSource = searchParams.get("source");
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/lead-counts")
      .then(r => r.json())
      .then(setCounts)
      .catch(() => {});
  }, []);

  const isActive = (href: string, source?: string) => {
    if (source) {
      return pathname === "/leads" && currentSource === source;
    }
    if (href === "/") return pathname === "/";
    if (href === "/methodology") return pathname === "/methodology";
    return false;
  };

  const linkClass = (active: boolean) =>
    `flex items-center justify-between px-3 py-2 rounded-[6px] text-sm font-medium transition-colors ${
      active
        ? "bg-cream text-dune border-l-2 border-ws-green"
        : "text-gray-50 hover:bg-gray-05 hover:text-dune"
    }`;

  const subLinkClass = (active: boolean) =>
    `flex items-center justify-between px-3 py-1.5 rounded-[6px] text-[13px] transition-colors ${
      active
        ? "bg-cream text-dune font-medium"
        : "text-gray-50 hover:bg-gray-05 hover:text-dune"
    }`;

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
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Top-level links */}
        <Link href="/" className={linkClass(isActive("/"))}>
          <div className="flex items-center gap-3">
            <DashboardIcon active={isActive("/")} />
            Dashboard
          </div>
        </Link>
        <Link href="/methodology" className={linkClass(isActive("/methodology"))}>
          <div className="flex items-center gap-3">
            <MethodologyIcon active={isActive("/methodology")} />
            Methodology
          </div>
        </Link>

        {/* Internal section */}
        <div className="pt-4">
          <p className="px-3 pb-2 text-[10px] font-semibold text-gray-30 uppercase tracking-wider">
            Internal
          </p>
          {INTERNAL_SOURCES.map((item) => {
            const active = isActive("/leads", item.source);
            return (
              <Link
                key={item.source}
                href={`/leads?source=${item.source}`}
                className={subLinkClass(active)}
              >
                <span>{item.label}</span>
                {counts[item.source] !== undefined && (
                  <span className="text-[11px] text-gray-30 bg-gray-05 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {counts[item.source]}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* External section */}
        <div className="pt-4">
          <p className="px-3 pb-2 text-[10px] font-semibold text-gray-30 uppercase tracking-wider">
            External
          </p>
          {EXTERNAL_SOURCES.map((item) => {
            const active = isActive("/leads", item.source);
            return (
              <Link
                key={item.source}
                href={`/leads?source=${item.source}`}
                className={subLinkClass(active)}
              >
                <span>{item.label}</span>
                {counts[item.source] !== undefined && (
                  <span className="text-[11px] text-gray-30 bg-gray-05 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {counts[item.source]}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Advisor Created section */}
        <div className="pt-4">
          <p className="px-3 pb-2 text-[10px] font-semibold text-gray-30 uppercase tracking-wider">
            Advisor Created
          </p>
          <Link
            href="/leads?source=advisor_created"
            className={subLinkClass(isActive("/leads", "advisor_created"))}
          >
            <span>My Leads</span>
            {counts["advisor_created"] !== undefined && (
              <span className="text-[11px] text-gray-30 bg-gray-05 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {counts["advisor_created"]}
              </span>
            )}
          </Link>
          <Link
            href="/leads/new"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-[13px] transition-colors ${
              pathname === "/leads/new"
                ? "bg-cream text-dune font-medium"
                : "text-ws-green hover:bg-ws-green-light/30 hover:text-ws-green-dark"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add from Documents
          </Link>
        </div>
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
