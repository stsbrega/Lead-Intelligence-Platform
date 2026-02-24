"use client";

import { useState } from "react";

interface Props {
  clientId: string;
  currentStatus: string;
  currentNotes: string;
}

export default function AdvisorDecisionPanel({ clientId, currentStatus, currentNotes }: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(currentNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    await fetch(`/api/leads/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, advisorNotes: notes }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="space-y-2">
        {[
          { value: "reviewed", label: "I have reviewed this analysis" },
          { value: "contacted", label: "Contact scheduled" },
          { value: "dismissed", label: "Dismissed" },
        ].map(option => (
          <label key={option.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="status"
              value={option.value}
              checked={status === option.value}
              onChange={(e) => setStatus(e.target.value)}
              className="w-4 h-4 accent-[#E8661A]"
            />
            <span className="text-sm text-dune">{option.label}</span>
          </label>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Advisor notes (e.g., schedule portfolio review, discuss consolidation...)"
        rows={3}
        className="w-full rounded-[6px] border border-gray-10 px-3 py-2 text-sm text-dune placeholder:text-gray-30 focus:outline-none focus:ring-2 focus:ring-ws-orange/30 focus:border-ws-orange bg-ws-white"
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-[6px] bg-ws-orange text-ws-white text-sm font-semibold hover:bg-[#d05a15] transition-colors disabled:opacity-50"
      >
        {saving ? "Saving..." : saved ? "Saved" : "Save Decision"}
      </button>

      {saved && (
        <p className="text-xs text-ws-green text-center">Decision saved successfully</p>
      )}
    </div>
  );
}
