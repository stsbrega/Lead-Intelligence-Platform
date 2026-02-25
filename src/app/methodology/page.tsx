import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  VERTICAL_WEIGHTS,
  TIER_THRESHOLDS,
  COMPLIANCE_GATE_MINIMUM,
  BEHAVIORAL_SIGNALS,
  INTENT_SIGNALS,
  NEGATIVE_SIGNALS,
} from "@/lib/scoring/config";
import type { BankingVertical, ScoringDimension } from "@/lib/scoring/types";

const dimensions: { key: ScoringDimension; label: string; description: string; color: string }[] = [
  {
    key: "demographic_fit",
    label: "Demographic Fit",
    description: "Evaluates how closely the lead matches the ideal customer profile (ICP) for the banking vertical. Includes age, geography, income, employment stability, and credit profile.",
    color: "bg-blue-500",
  },
  {
    key: "financial_qualification",
    label: "Financial Qualification",
    description: "Assesses the lead's ability to realistically qualify for and benefit from the banking product. Examines DTI ratio, collateral, cash flow, existing relationships, and product fit.",
    color: "bg-ws-green",
  },
  {
    key: "behavioral_engagement",
    label: "Behavioral Engagement",
    description: "Tracks how actively a lead interacts with the institution across digital and physical channels. Research shows behavioral signals outpredict demographics in conversion forecasting.",
    color: "bg-ws-orange",
  },
  {
    key: "intent_signals",
    label: "Intent Signals",
    description: "Measures how close a lead is to making a purchasing decision. These are the highest-predictive signals — application starts, rate comparisons, life events, and urgency language.",
    color: "bg-purple-500",
  },
  {
    key: "compliance_readiness",
    label: "Compliance Readiness",
    description: "Evaluates how easily a lead can pass KYC/AML screening. This is a gating dimension — leads scoring below the minimum threshold are held regardless of composite score.",
    color: "bg-teal-500",
  },
];

const verticals: { key: BankingVertical; label: string; rationale: string }[] = [
  {
    key: "retail_banking",
    label: "Retail Banking",
    rationale: "Behavioral engagement weighted highest (30%) because retail products have shorter sales cycles and digital-first acquisition. Volume is high, so engagement signals are the strongest predictor.",
  },
  {
    key: "commercial_banking",
    label: "Commercial Banking",
    rationale: "Financial qualification (25%) and intent signals (25%) carry the most weight because commercial relationships involve significant credit risk assessment and longer evaluation cycles.",
  },
  {
    key: "mortgage_lending",
    label: "Mortgage Lending",
    rationale: "Financial qualification weighted most heavily (30%) because DTI, credit score, down payment capacity, and employment stability are the primary gatekeeping criteria for loan approval.",
  },
  {
    key: "wealth_management",
    label: "Wealth Management",
    rationale: "Compliance readiness weighted higher (20%) due to accredited investor requirements, source-of-funds documentation, and regulatory scrutiny of high-value accounts.",
  },
];

export default function MethodologyPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-dune mb-2">
        Lead Qualification Methodology
      </h1>
      <p className="text-gray-50 mb-8">
        Tiered sub-score methodology with weighted multi-factor model across four banking verticals.
      </p>

      {/* Architecture Overview */}
      <Card className="p-6 mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-dune mb-3">
          Scoring Architecture
        </h2>
        <p className="text-sm text-gray-70 leading-relaxed mb-4">
          Every lead is evaluated across five scoring dimensions, each producing a sub-score from 0 to 100.
          Sub-scores are weighted by banking vertical and combined into a composite score (0&ndash;100),
          which maps to a letter tier (A through D) with clear routing logic.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-10 rounded-[6px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-ws-green" />
              <h3 className="text-sm font-semibold text-dune">Layer 1: Rules-Based Qualification</h3>
            </div>
            <p className="text-xs text-gray-50 leading-relaxed">
              The five-dimension scoring engine evaluates demographic fit, financial qualification,
              behavioral engagement, intent signals, and compliance readiness. Produces a transparent,
              auditable composite score with vertical-specific weights.
            </p>
          </div>
          <div className="border border-gray-10 rounded-[6px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-ws-orange" />
              <h3 className="text-sm font-semibold text-dune">Layer 2: AI Synthesis (Claude)</h3>
            </div>
            <p className="text-xs text-gray-50 leading-relaxed">
              Claude reviews the qualification scores alongside transaction patterns to produce
              a holistic summary, detailed reasoning with dollar amounts, and prioritized action
              recommendations for advisors.
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-30 mt-3 italic">
          Based on hybrid BANT/MEDDIC/CHAMP framework adapted for financial services.
        </p>
      </Card>

      {/* Five Dimensions */}
      <Card className="p-6 mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-dune mb-3">
          Five Scoring Dimensions
        </h2>
        <p className="text-sm text-gray-50 mb-4">
          Each dimension produces a sub-score from 0 to 100 based on multiple criteria.
        </p>
        <div className="space-y-4">
          {dimensions.map(dim => (
            <div key={dim.key} className="border border-gray-10 rounded-[6px] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${dim.color}`} />
                <h3 className="text-sm font-semibold text-dune">{dim.label}</h3>
              </div>
              <p className="text-xs text-gray-50 leading-relaxed">{dim.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Vertical Weights */}
      <Card className="p-6 mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-dune mb-3">
          Vertical-Specific Weight Configuration
        </h2>
        <p className="text-sm text-gray-50 mb-4">
          Each banking vertical has distinct conversion drivers, so the five dimensions are weighted differently.
        </p>
        <div className="overflow-hidden rounded-[6px] border border-gray-10">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-05">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">Dimension</th>
                {verticals.map(v => (
                  <th key={v.key} className="text-center py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">
                    {v.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dimensions.map((dim, i) => (
                <tr key={dim.key} className={i % 2 === 0 ? "bg-ws-white" : "bg-gray-05/50"}>
                  <td className="py-2.5 px-4 text-sm text-dune">{dim.label}</td>
                  {verticals.map(v => {
                    const weight = VERTICAL_WEIGHTS[v.key][dim.key];
                    const isMax = weight === Math.max(...Object.values(VERTICAL_WEIGHTS[v.key]));
                    return (
                      <td key={v.key} className="py-2.5 px-4 text-center">
                        <span className={`text-sm ${isMax ? "font-bold text-ws-green" : "text-gray-70"}`}>
                          {(weight * 100).toFixed(0)}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-gray-10 bg-gray-05">
                <td className="py-2.5 px-4 text-sm font-semibold text-dune">Total</td>
                {verticals.map(v => (
                  <td key={v.key} className="py-2.5 px-4 text-center text-sm font-semibold text-dune">100%</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-3">
          {verticals.map(v => (
            <div key={v.key} className="flex items-start gap-2 text-xs">
              <span className="font-semibold text-dune min-w-[140px]">{v.label}:</span>
              <span className="text-gray-50">{v.rationale}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Tier Grading */}
      <Card className="p-6 mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-dune mb-3">
          Tier Grading System
        </h2>
        <p className="text-sm text-gray-50 mb-4">
          Composite score = &Sigma;(sub-score &times; weight) + negative adjustments, clamped 0&ndash;100.
          Mapped to a letter tier with routing logic:
        </p>
        <div className="overflow-hidden rounded-[6px] border border-gray-10">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-05">
                <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider w-16">Tier</th>
                <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider w-24">Score</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">Label</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">Routing Action</th>
              </tr>
            </thead>
            <tbody>
              {TIER_THRESHOLDS.map((t, i) => {
                const colors: Record<string, string> = {
                  A: "bg-ws-green-light text-ws-green-dark",
                  B: "bg-ws-orange-light text-ws-orange",
                  C: "bg-ws-yellow-light text-dune",
                  D: "bg-gray-05 text-gray-50",
                };
                return (
                  <tr key={t.tier} className={i % 2 === 0 ? "bg-ws-white" : "bg-gray-05/50"}>
                    <td className="py-2.5 px-4 text-center">
                      <Badge className={colors[t.tier]}>{t.tier}</Badge>
                    </td>
                    <td className="py-2.5 px-4 text-center text-sm text-dune font-medium">
                      {t.minScore}&ndash;{t.maxScore}
                    </td>
                    <td className="py-2.5 px-4 text-sm text-dune font-medium">{t.label}</td>
                    <td className="py-2.5 px-4 text-xs text-gray-50">{t.routingAction}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Compliance Gate */}
      <Card className="p-6 mb-6 border-l-4 border-ws-orange">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-dune mb-3">
          Compliance Gate
        </h2>
        <p className="text-sm text-gray-70 leading-relaxed mb-2">
          Compliance Readiness acts as a <strong>binary gate</strong> independent of the composite score.
          If a lead&apos;s Compliance Readiness sub-score falls below <strong>{COMPLIANCE_GATE_MINIMUM}</strong> (out of 100),
          the lead is automatically held in a review queue regardless of its composite tier.
        </p>
        <div className="flex items-center gap-4 mt-3">
          <Badge className="bg-ws-green-light text-ws-green-dark">Pass</Badge>
          <span className="text-xs text-gray-50">Compliance sub-score &ge; {COMPLIANCE_GATE_MINIMUM}</span>
          <Badge className="bg-ws-orange-light text-ws-orange">Hold for Review</Badge>
          <span className="text-xs text-gray-50">Sub-score &lt; {COMPLIANCE_GATE_MINIMUM}</span>
          <Badge className="bg-ws-red-light text-ws-red">Disqualified</Badge>
          <span className="text-xs text-gray-50">Sanctions/adverse media flag</span>
        </div>
      </Card>

      {/* Behavioral Signals */}
      <Card className="p-6 mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-dune mb-3">
          Behavioral Engagement Signals
        </h2>
        <p className="text-sm text-gray-50 mb-4">
          Behavioral scoring tracks interactions across digital and physical channels. Each signal has a point value and decay half-life.
        </p>
        <div className="overflow-hidden rounded-[6px] border border-gray-10">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-05">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">Signal</th>
                <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">Points</th>
                <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">Half-Life</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(BEHAVIORAL_SIGNALS).map(([key, signal], i) => (
                <tr key={key} className={i % 2 === 0 ? "bg-ws-white" : "bg-gray-05/50"}>
                  <td className="py-2.5 px-4 text-sm text-dune">{key.replace(/_/g, " ")}</td>
                  <td className="py-2.5 px-4 text-center text-sm font-medium text-dune">{signal.points}</td>
                  <td className="py-2.5 px-4 text-center text-xs text-gray-50">
                    {signal.halfLifeDays === 0 ? "No decay" : `${signal.halfLifeDays} days`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Intent Signals */}
      <Card className="p-6 mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-dune mb-3">
          Intent Signals
        </h2>
        <p className="text-sm text-gray-50 mb-4">
          Intent signals measure proximity to a purchase decision. These are the highest-predictive factors.
        </p>
        <div className="overflow-hidden rounded-[6px] border border-gray-10">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-05">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">Signal</th>
                <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">Points</th>
                <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">Half-Life</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(INTENT_SIGNALS).map(([key, signal], i) => (
                <tr key={key} className={i % 2 === 0 ? "bg-ws-white" : "bg-gray-05/50"}>
                  <td className="py-2.5 px-4 text-sm text-dune">{key.replace(/_/g, " ")}</td>
                  <td className="py-2.5 px-4 text-center text-sm font-medium text-dune">{signal.points}</td>
                  <td className="py-2.5 px-4 text-center text-xs text-gray-50">{signal.halfLifeDays} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Negative Scoring */}
      <Card className="p-6 mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-dune mb-3">
          Negative Scoring
        </h2>
        <p className="text-sm text-gray-50 mb-4">
          Negative scoring deducts points from leads exhibiting disqualifying signals, preventing sales from pursuing low-quality leads.
        </p>
        <div className="overflow-hidden rounded-[6px] border border-gray-10">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-05">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">Signal</th>
                <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">Deduction</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(NEGATIVE_SIGNALS).map(([key, signal], i) => (
                <tr key={key} className={i % 2 === 0 ? "bg-ws-white" : "bg-gray-05/50"}>
                  <td className="py-2.5 px-4 text-sm text-dune">{key.replace(/_/g, " ")}</td>
                  <td className="py-2.5 px-4 text-center text-sm font-medium text-ws-red">{signal.points}</td>
                  <td className="py-2.5 px-4 text-xs text-gray-50">{signal.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Score Decay */}
      <Card className="p-6 mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-dune mb-3">
          Score Decay
        </h2>
        <p className="text-sm text-gray-70 leading-relaxed mb-2">
          Behavioral and intent sub-scores decay over time using a <strong>half-life model</strong>.
          Each signal type has a half-life (in days) after which the signal&apos;s point value is halved.
          This ensures leads who were once active but have gone cold are automatically deprioritized.
        </p>
        <p className="text-sm text-gray-70 leading-relaxed">
          <strong>Formula:</strong> Decayed Value = Initial Points &times; 0.5^(days elapsed / half-life).
          Customer referrals are the only signal with no decay. A quarterly model recalibration is recommended.
        </p>
      </Card>

      {/* Human Boundary */}
      <Card className="p-6 border-l-4 border-ws-orange">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-dune mb-3">
          Human Decision Boundary
        </h2>
        <p className="text-sm text-gray-70 leading-relaxed mb-4">
          The scoring system is designed to inform, not decide. Every lead requires explicit advisor acknowledgment before any action is taken.
        </p>
        <div className="space-y-2">
          <p className="text-sm text-gray-70">
            <span className="font-semibold text-dune">The system does:</span> Score across five dimensions, assign tiers, flag compliance risks, detect behavioral and intent signals, and suggest routing actions.
          </p>
          <p className="text-sm text-gray-70">
            <span className="font-semibold text-dune">The system does not:</span> Recommend specific financial products, decide whether to contact a client, assume risk tolerance or goals, or provide financial advice.
          </p>
        </div>
      </Card>
    </div>
  );
}
