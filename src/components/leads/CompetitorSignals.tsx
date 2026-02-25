"use client";

import CompetitorCompareModal from "./CompetitorCompareModal";

interface Signal {
  type: string;
  description: string;
  severity: string;
  estimatedValue: number;
}

interface ClientContext {
  annualIncome: number;
  totalBalance: number;
  age: number;
  province: string;
}

interface Props {
  signals: Signal[];
  clientContext: ClientContext;
}

const COMPETITOR_SIGNAL_TYPES = [
  "competitor_rrsp",
  "competitor_tfsa",
  "competitor_investment",
  "competitor_insurance",
];

const SEVERITY_COLORS: Record<string, string> = {
  high: "border-l-ws-red bg-ws-red/5",
  medium: "border-l-ws-orange bg-ws-orange-light/30",
  low: "border-l-ws-green bg-ws-green-light/30",
};

const SIGNAL_LABELS: Record<string, string> = {
  competitor_rrsp: "Competitor RRSP",
  competitor_tfsa: "Competitor TFSA",
  competitor_investment: "Competitor Investment",
  competitor_insurance: "Competitor Insurance",
  mortgage_refinance: "Mortgage Refinance",
  income_change: "Income Change",
  large_balance_idle: "Idle Balance",
  life_event: "Life Event",
  spending_pattern: "Spending Pattern",
  loan_ending: "Loan Ending",
};

function extractCompetitorName(description: string): string | null {
  // Pattern: "$X,XXX/mo flowing to [Competitor Name]" or "to [Competitor Name] (RRSP)"
  const match = description.match(/flowing to ([^(]+?)(?:\s*\(|$)/);
  if (match) return match[1].trim();

  // Pattern: "premiums of $X,XXX/mo to competitor"
  const premiumMatch = description.match(/to (.+?)$/);
  if (premiumMatch && premiumMatch[1] !== "competitor") return premiumMatch[1].trim();

  return null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

export default function CompetitorSignals({ signals, clientContext }: Props) {
  return (
    <div className="space-y-3">
      {signals.map((signal, i) => {
        const isCompetitorSignal = COMPETITOR_SIGNAL_TYPES.includes(signal.type);
        const competitorName = isCompetitorSignal ? extractCompetitorName(signal.description) : null;

        return (
          <div
            key={i}
            className={`border-l-4 rounded-[6px] p-4 ${SEVERITY_COLORS[signal.severity] || SEVERITY_COLORS.low}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-50 uppercase">
                    {SIGNAL_LABELS[signal.type] || signal.type.replace(/_/g, " ")}
                  </span>
                  {competitorName && (
                    <CompetitorCompareModal
                      competitorName={competitorName}
                      signalDescription={signal.description}
                      estimatedValue={signal.estimatedValue}
                      clientContext={clientContext}
                    />
                  )}
                </div>
                <p className="text-sm text-dune mt-0.5">{signal.description}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-sm font-semibold text-dune">
                  {formatCurrency(signal.estimatedValue)}
                </p>
                <p className="text-xs text-gray-50">est. annual value</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
