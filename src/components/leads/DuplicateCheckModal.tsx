"use client";

import { useState } from "react";
import type { DuplicateCandidate } from "@/lib/data/duplicate-check";

interface PendingLeadData {
  clientProfile: {
    firstName: string;
    lastName: string;
    occupation: string;
    city: string;
    province: string;
    estimatedAge: number;
    estimatedAnnualIncome: number;
  };
  analysis: {
    score: number;
    confidence: string;
  };
  modelUsed: string;
  notesText: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  pendingLead: PendingLeadData;
  duplicates: DuplicateCandidate[];
  onConfirmCreate: () => Promise<void>;
  onConfirmAttach: (clientId: string) => Promise<void>;
}

export type { PendingLeadData };

export default function DuplicateCheckModal({
  open,
  onClose,
  pendingLead,
  duplicates,
  onConfirmCreate,
  onConfirmAttach,
}: Props) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const hasDuplicates = duplicates.length > 0;
  const { clientProfile, analysis } = pendingLead;
  const fullName = `${clientProfile.firstName} ${clientProfile.lastName}`;

  async function handleCreate() {
    setLoading(true);
    try {
      await onConfirmCreate();
    } finally {
      setLoading(false);
    }
  }

  async function handleAttach(clientId: string) {
    setLoading(true);
    try {
      await onConfirmAttach(clientId);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dune/40 backdrop-blur-sm"
      onClick={() => !loading && onClose()}
    >
      <div
        className="bg-ws-white rounded-[12px] shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-ws-white border-b border-gray-10 px-6 py-4 rounded-t-[12px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasDuplicates ? (
              <div className="w-8 h-8 rounded-full bg-ws-orange-light flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L14.9282 13H1.0718L8 1Z" stroke="#E8661A" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M8 6V9" stroke="#E8661A" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="8" cy="11" r="0.75" fill="#E8661A" />
                </svg>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-ws-green-light flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="#007A56" strokeWidth="1.5" />
                  <path d="M5.5 8L7 9.5L10.5 6" stroke="#007A56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-dune">
                {hasDuplicates ? "Potential Duplicate Detected" : "Confirm New Lead"}
              </h2>
              <p className="text-xs text-gray-50 mt-0.5">
                {hasDuplicates
                  ? `${duplicates.length} existing lead${duplicates.length > 1 ? "s" : ""} may match this person`
                  : "No existing leads match this person"}
              </p>
            </div>
          </div>
          <button
            onClick={() => !loading && onClose()}
            className="w-8 h-8 rounded-full bg-gray-05 flex items-center justify-center text-gray-50 hover:bg-gray-10 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Loading overlay */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border-2 border-gray-10" />
                <div className="absolute inset-0 rounded-full border-2 border-ws-orange border-t-transparent animate-spin" />
              </div>
              <p className="text-sm text-gray-50">Processing...</p>
            </div>
          )}

          {!loading && (
            <>
              {/* New Lead Card */}
              <div>
                <p className="text-xs font-semibold text-gray-50 uppercase tracking-wider mb-2">
                  From Uploaded Document
                </p>
                <div className="bg-cream border border-gray-10 rounded-[8px] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-dune">{fullName}</p>
                      <p className="text-xs text-gray-50 mt-0.5">
                        {[clientProfile.occupation, clientProfile.city, clientProfile.province]
                          .filter((s) => s && s !== "Unknown")
                          .join(" · ") || "No details extracted"}
                      </p>
                      {clientProfile.estimatedAge > 0 && (
                        <p className="text-xs text-gray-50">
                          ~{clientProfile.estimatedAge} years old
                          {clientProfile.estimatedAnnualIncome > 0 &&
                            ` · ~$${clientProfile.estimatedAnnualIncome.toLocaleString()} income`}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-dune">{analysis.score}</div>
                      <div className="text-[10px] text-gray-50 uppercase">Score</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Existing Matches */}
              {hasDuplicates && (
                <div>
                  <p className="text-xs font-semibold text-gray-50 uppercase tracking-wider mb-2">
                    Existing Matches
                  </p>
                  <div className="space-y-3">
                    {duplicates.map((dup) => (
                      <div
                        key={dup.clientId}
                        className="bg-ws-white border border-gray-10 rounded-[8px] p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-dune">
                                {dup.firstName} {dup.lastName}
                              </p>
                              <ConfidenceBadge confidence={dup.matchConfidence} />
                            </div>
                            <p className="text-xs text-gray-50 mt-0.5">
                              {[dup.occupation, dup.city, dup.province]
                                .filter((s) => s && s !== "Unknown")
                                .join(" · ") || "No details"}
                            </p>
                            {dup.age > 0 && (
                              <p className="text-xs text-gray-50">
                                {dup.age} years old
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {dup.matchReasons.map((reason, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-gray-05 text-gray-70"
                                >
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            {dup.score !== null && (
                              <div className="text-right mr-2">
                                <div className="text-sm font-bold text-dune">{dup.score}</div>
                                <div className="text-[10px] text-gray-50">Score</div>
                              </div>
                            )}
                            <button
                              onClick={() => handleAttach(dup.clientId)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-[8px] bg-ws-green text-ws-white hover:bg-ws-green-dark transition-colors whitespace-nowrap"
                            >
                              Attach to this lead
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No duplicates message */}
              {!hasDuplicates && (
                <p className="text-sm text-gray-50 text-center py-2">
                  No existing leads match this person. Ready to create a new lead.
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-10">
                <button
                  onClick={() => onClose()}
                  className="text-sm text-gray-50 hover:text-dune transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className={`px-4 py-2 text-sm font-semibold rounded-[8px] transition-colors ${
                    hasDuplicates
                      ? "bg-gray-05 text-dune hover:bg-gray-10 border border-gray-20"
                      : "bg-dune text-ws-white hover:bg-gray-70"
                  }`}
                >
                  {hasDuplicates ? "Create as new lead anyway" : "Create lead"}
                </button>
              </div>

              {/* Disclaimer */}
              <p className="text-[10px] text-gray-30 text-center leading-relaxed">
                AI-extracted profile details may be approximate. Verify client information before taking action.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: "exact" | "high" | "medium" }) {
  const styles = {
    exact: "bg-ws-red-light text-ws-red",
    high: "bg-ws-orange-light text-ws-orange",
    medium: "bg-gray-05 text-gray-50",
  };
  const labels = {
    exact: "Exact match",
    high: "Likely match",
    medium: "Possible match",
  };

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles[confidence]}`}>
      {labels[confidence]}
    </span>
  );
}
