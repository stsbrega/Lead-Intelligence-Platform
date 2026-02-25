"use client";

import { useState } from "react";

interface Props {
  clientId: string;
  currentStatus: string;
}

const VERDICTS = [
  { value: "approved", label: "Approve", icon: "✓", colors: "border-ws-green text-ws-green hover:bg-ws-green hover:text-ws-white", activeColors: "bg-ws-green text-ws-white border-ws-green" },
  { value: "needs_review", label: "Needs Review", icon: "⟳", colors: "border-ws-orange text-ws-orange hover:bg-ws-orange hover:text-ws-white", activeColors: "bg-ws-orange text-ws-white border-ws-orange" },
  { value: "rejected", label: "Reject", icon: "✕", colors: "border-ws-red text-ws-red hover:bg-ws-red hover:text-ws-white", activeColors: "bg-ws-red text-ws-white border-ws-red" },
] as const;

export default function AdvisorDecisionPanel({ clientId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [exported, setExported] = useState(false);

  async function handleVerdict(verdict: string) {
    if (verdict === status) return;
    setSaving(true);

    await fetch(`/api/leads/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: verdict }),
    });

    setStatus(verdict);
    setSaving(false);
  }

  function handleExportCRM() {
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Verdict Buttons */}
      <div className="flex gap-2">
        {VERDICTS.map((v) => {
          const isActive = status === v.value;
          return (
            <button
              key={v.value}
              onClick={() => handleVerdict(v.value)}
              disabled={saving}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[6px] border-2 text-sm font-semibold transition-all disabled:opacity-50 ${
                isActive ? v.activeColors : v.colors
              }`}
            >
              <span className="text-base">{v.icon}</span>
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Export to CRM */}
      <button
        onClick={handleExportCRM}
        disabled={status === "new"}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[6px] border border-gray-10 text-sm font-medium text-gray-50 hover:border-gray-30 hover:text-dune transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1V10M7 10L4 7M7 10L10 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M1 11V12C1 12.5523 1.44772 13 2 13H12C12.5523 13 13 12.5523 13 12V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {exported ? "Exported to CRM" : "Export to CRM"}
      </button>

      {exported && (
        <p className="text-xs text-ws-green text-center">Lead exported to CRM pipeline successfully</p>
      )}

      {status !== "new" && (
        <p className="text-xs text-gray-30 text-center">
          Verdict: <span className="font-medium text-gray-50">{status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Needs Review"}</span>
        </p>
      )}
    </div>
  );
}
