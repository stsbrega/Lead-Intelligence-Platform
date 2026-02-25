"use client";

import { useState } from "react";

interface ComparisonData {
  competitorName: string;
  competitorPros: string[];
  competitorCons: string[];
  wealthsimplePros: string[];
  wealthsimpleCons: string[];
  valueStatement: string;
  keyDifferentiators: {
    area: string;
    competitor: string;
    wealthsimple: string;
    advantage: "wealthsimple" | "competitor" | "neutral";
  }[];
  switchingConsiderations: string;
}

interface Props {
  competitorName: string;
  signalDescription: string;
  estimatedValue: number;
  clientContext: {
    annualIncome: number;
    totalBalance: number;
    age: number;
    province: string;
  };
}

export default function CompetitorCompareModal({
  competitorName,
  signalDescription,
  estimatedValue,
  clientContext,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ComparisonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function fetchComparison() {
    if (data) {
      setOpen(true);
      return;
    }

    setOpen(true);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/competitor-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitorName,
          signalDescription,
          estimatedValue,
          clientContext,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate comparison");
      const result = await res.json();
      setData(result);
    } catch {
      setError("Unable to generate comparison. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyValueStatement() {
    if (!data) return;
    navigator.clipboard.writeText(data.valueStatement);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {/* Trigger button — inline with signal */}
      <button
        onClick={fetchComparison}
        className="ml-3 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-gray-05 text-gray-70 hover:bg-ws-orange-light hover:text-ws-orange transition-colors whitespace-nowrap"
      >
        Compare vs WS
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-dune/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-ws-white rounded-[12px] shadow-xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-ws-white border-b border-gray-10 px-6 py-4 rounded-t-[12px] flex items-center justify-between">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-dune">
                  {competitorName} vs Wealthsimple
                </h2>
                <p className="text-xs text-gray-50 mt-0.5">
                  AI-generated competitive analysis for advisor use
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-05 flex items-center justify-center text-gray-50 hover:bg-gray-10 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Loading state */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-2 border-gray-10" />
                    <div className="absolute inset-0 rounded-full border-2 border-ws-orange border-t-transparent animate-spin" />
                  </div>
                  <p className="text-sm text-gray-50">Generating competitive analysis...</p>
                  <p className="text-xs text-gray-30">Comparing products, fees, and services</p>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="text-center py-12">
                  <p className="text-sm text-ws-red">{error}</p>
                  <button
                    onClick={() => { setData(null); fetchComparison(); }}
                    className="mt-3 text-sm text-ws-orange hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Comparison data */}
              {data && (
                <>
                  {/* Value Statement — the hero */}
                  <div className="bg-gradient-to-br from-ws-orange-light/60 to-cream border border-ws-orange/20 rounded-[8px] p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-ws-orange uppercase tracking-wider">
                        Advisor Value Statement
                      </h3>
                      <button
                        onClick={handleCopyValueStatement}
                        className="flex items-center gap-1.5 text-[11px] text-gray-50 hover:text-ws-orange transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
                          <path d="M8 4V2.5A1.5 1.5 0 006.5 1H2.5A1.5 1.5 0 001 2.5V6.5A1.5 1.5 0 002.5 8H4" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-sm text-dune leading-relaxed italic">
                      &ldquo;{data.valueStatement}&rdquo;
                    </p>
                  </div>

                  {/* Key Differentiators Table */}
                  {data.keyDifferentiators.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-50 uppercase tracking-wider mb-3">
                        Head-to-Head Comparison
                      </h3>
                      <div className="border border-gray-10 rounded-[8px] overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-05">
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-50 w-[22%]">Area</th>
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-50 w-[35%]">{data.competitorName}</th>
                              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-50 w-[35%]">Wealthsimple</th>
                              <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-50 w-[8%]"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.keyDifferentiators.map((diff, i) => (
                              <tr key={i} className="border-t border-gray-10/60">
                                <td className="py-2.5 px-3 text-xs font-medium text-dune">{diff.area}</td>
                                <td className={`py-2.5 px-3 text-xs ${diff.advantage === "competitor" ? "text-dune font-medium" : "text-gray-50"}`}>
                                  {diff.competitor}
                                </td>
                                <td className={`py-2.5 px-3 text-xs ${diff.advantage === "wealthsimple" ? "text-dune font-medium" : "text-gray-50"}`}>
                                  {diff.wealthsimple}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {diff.advantage === "wealthsimple" && (
                                    <span className="inline-block w-2 h-2 rounded-full bg-ws-green" title="Wealthsimple advantage" />
                                  )}
                                  {diff.advantage === "competitor" && (
                                    <span className="inline-block w-2 h-2 rounded-full bg-ws-red" title="Competitor advantage" />
                                  )}
                                  {diff.advantage === "neutral" && (
                                    <span className="inline-block w-2 h-2 rounded-full bg-gray-30" title="Similar" />
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Pros/Cons side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Competitor column */}
                    <div>
                      <h3 className="text-xs font-semibold text-gray-50 uppercase tracking-wider mb-3">
                        {data.competitorName}
                      </h3>
                      <div className="space-y-2">
                        {data.competitorPros.map((pro, i) => (
                          <div key={`cp-${i}`} className="flex items-start gap-2 text-xs text-gray-70">
                            <span className="text-ws-green mt-0.5 flex-shrink-0">+</span>
                            <span>{pro}</span>
                          </div>
                        ))}
                        {data.competitorCons.map((con, i) => (
                          <div key={`cc-${i}`} className="flex items-start gap-2 text-xs text-gray-70">
                            <span className="text-ws-red mt-0.5 flex-shrink-0">&minus;</span>
                            <span>{con}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Wealthsimple column */}
                    <div>
                      <h3 className="text-xs font-semibold text-gray-50 uppercase tracking-wider mb-3">
                        Wealthsimple
                      </h3>
                      <div className="space-y-2">
                        {data.wealthsimplePros.map((pro, i) => (
                          <div key={`wp-${i}`} className="flex items-start gap-2 text-xs text-gray-70">
                            <span className="text-ws-green mt-0.5 flex-shrink-0">+</span>
                            <span>{pro}</span>
                          </div>
                        ))}
                        {data.wealthsimpleCons.map((con, i) => (
                          <div key={`wc-${i}`} className="flex items-start gap-2 text-xs text-gray-70">
                            <span className="text-ws-red mt-0.5 flex-shrink-0">&minus;</span>
                            <span>{con}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Switching Considerations */}
                  <div className="bg-cream border border-gray-10 rounded-[8px] p-4">
                    <h3 className="text-xs font-semibold text-gray-50 uppercase tracking-wider mb-2">
                      Switching Considerations
                    </h3>
                    <p className="text-xs text-gray-70 leading-relaxed">
                      {data.switchingConsiderations}
                    </p>
                  </div>

                  {/* Disclaimer */}
                  <p className="text-[10px] text-gray-30 text-center leading-relaxed">
                    AI-generated analysis for advisor reference only. Verify current rates, fees, and offerings before client conversations.
                    Suitability assessment required before recommending specific products.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
