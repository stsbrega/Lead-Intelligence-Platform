import Card from "@/components/ui/Card";

const signalTypes = [
  {
    name: "Competitor RRSP",
    description: "Recurring PAD contributions to competitor RRSP accounts (TD, RBC, BMO, CIBC, Questrade, etc.)",
    severity: "High if \u2265$2,000/mo, Medium if \u2265$500/mo, Low otherwise",
  },
  {
    name: "Competitor TFSA",
    description: "Recurring PAD contributions to competitor TFSA accounts",
    severity: "High if \u2265$2,000/mo, Medium if \u2265$500/mo, Low otherwise",
  },
  {
    name: "Competitor Investment",
    description: "General non-registered investment contributions to competitor platforms",
    severity: "High if \u2265$2,000/mo, Medium if \u2265$500/mo, Low otherwise",
  },
  {
    name: "Mortgage Refinance",
    description: "Recurring mortgage payments to another institution (3+ months of payments detected)",
    severity: "High if \u2265$2,500/mo, Medium otherwise",
  },
  {
    name: "Income Change",
    description: "Direct deposit amounts increased by 10%+ between earlier and recent pay periods",
    severity: "High if \u226520% increase, Medium if \u226510% increase",
  },
  {
    name: "Large Idle Balance",
    description: "Chequing balance exceeds $25,000 with no investment activity detected",
    severity: "High if \u2265$50,000, Medium if \u2265$25,000",
  },
  {
    name: "Life Event",
    description: "One-time large deposit exceeding $10,000 (inheritance, bonus, property sale, etc.)",
    severity: "High if \u2265$20,000, Medium if \u2265$10,000",
  },
  {
    name: "Loan Ending",
    description: "Student loan or other loan payments appear to have stopped, freeing up monthly cash flow",
    severity: "Medium",
  },
  {
    name: "Competitor Insurance",
    description: "Recurring insurance premiums to Sun Life, Manulife, Great-West Life, Canada Life, etc.",
    severity: "Low",
  },
];

const scoreRanges = [
  { range: "80\u2013100", label: "High Priority", color: "bg-ws-green", textColor: "text-ws-green-dark", description: "Significant competitor assets, large opportunity, clear and multiple signals" },
  { range: "60\u201379", label: "Medium Priority", color: "bg-ws-orange", textColor: "text-ws-orange", description: "Meaningful signals with moderate opportunity size" },
  { range: "40\u201359", label: "Emerging", color: "bg-ws-yellow", textColor: "text-dune", description: "Early-stage signals \u2014 monitoring recommended" },
  { range: "0\u201339", label: "Low Priority", color: "bg-gray-30", textColor: "text-gray-50", description: "Minimal actionable signals detected" },
];

export default function MethodologyPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-dune mb-2">
        Scoring Methodology
      </h1>
      <p className="text-gray-50 mb-8">
        How the Lead Intelligence system identifies and prioritizes advisor opportunities.
      </p>

      {/* Overview */}
      <Card className="p-6 mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-dune mb-3">
          Two-Layer Analysis System
        </h2>
        <p className="text-sm text-gray-70 leading-relaxed mb-4">
          Every client is analyzed through two complementary layers to balance speed, auditability, and depth of insight.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-10 rounded-[6px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-ws-green" />
              <h3 className="text-sm font-semibold text-dune">Layer 1: Rule-Based Signals</h3>
            </div>
            <p className="text-xs text-gray-50 leading-relaxed">
              Deterministic pattern matching scans all transactions for known competitor products,
              recurring payments, income shifts, and balance thresholds. This layer is fast,
              auditable, and runs identically every time.
            </p>
          </div>
          <div className="border border-gray-10 rounded-[6px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-ws-orange" />
              <h3 className="text-sm font-semibold text-dune">Layer 2: AI Synthesis (Claude)</h3>
            </div>
            <p className="text-xs text-gray-50 leading-relaxed">
              Claude reviews the pre-detected signals alongside the 40 most recent transactions to
              produce a holistic score, plain-English summary, detailed reasoning with dollar amounts,
              and prioritized action recommendations.
            </p>
          </div>
        </div>
      </Card>

      {/* Signal Detection */}
      <Card className="p-6 mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-dune mb-3">
          Signal Types
        </h2>
        <p className="text-sm text-gray-50 mb-4">
          The rule engine detects 9 categories of opportunity signals from transaction data.
        </p>
        <div className="overflow-hidden rounded-[6px] border border-gray-10">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-05">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">Signal</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">What It Detects</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">Severity Criteria</th>
              </tr>
            </thead>
            <tbody>
              {signalTypes.map((signal, i) => (
                <tr key={signal.name} className={i % 2 === 0 ? "bg-ws-white" : "bg-gray-05/50"}>
                  <td className="py-2.5 px-4 text-sm font-medium text-dune whitespace-nowrap">{signal.name}</td>
                  <td className="py-2.5 px-4 text-sm text-gray-70">{signal.description}</td>
                  <td className="py-2.5 px-4 text-xs text-gray-50">{signal.severity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Score Ranges */}
      <Card className="p-6 mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-dune mb-3">
          Score Ranges
        </h2>
        <p className="text-sm text-gray-50 mb-4">
          The final score (0&ndash;100) reflects opportunity size, conversion likelihood, and urgency.
        </p>
        <div className="space-y-3">
          {scoreRanges.map(r => (
            <div key={r.range} className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${r.color} flex-shrink-0`} />
              <span className={`text-sm font-semibold w-20 ${r.textColor}`}>{r.range}</span>
              <span className="text-sm font-medium text-dune w-28">{r.label}</span>
              <span className="text-sm text-gray-50">{r.description}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Confidence Levels */}
      <Card className="p-6 mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-dune mb-3">
          Confidence Levels
        </h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold text-ws-green bg-ws-green-light px-2 py-0.5 rounded-full w-20 text-center flex-shrink-0">High</span>
            <p className="text-sm text-gray-70">Multiple strong signals corroborated by transaction data. The AI found clear, consistent evidence supporting the assessment.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold text-ws-orange bg-ws-orange-light px-2 py-0.5 rounded-full w-20 text-center flex-shrink-0">Medium</span>
            <p className="text-sm text-gray-70">Signals are present but may be ambiguous or based on limited data points. Advisor review is especially important.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold text-gray-50 bg-gray-05 px-2 py-0.5 rounded-full w-20 text-center flex-shrink-0">Low</span>
            <p className="text-sm text-gray-70">Weak or indirect signals. The analysis is speculative and should be treated as a starting point for further investigation.</p>
          </div>
        </div>
      </Card>

      {/* Human Boundary */}
      <Card className="p-6 border-l-4 border-ws-orange">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-dune mb-3">
          Human Decision Boundary
        </h2>
        <p className="text-sm text-gray-70 leading-relaxed mb-4">
          The AI system is designed to inform, not decide. Every lead requires explicit advisor acknowledgment before any action is taken.
        </p>
        <div className="space-y-2">
          <p className="text-sm text-gray-70">
            <span className="font-semibold text-dune">The AI does:</span> Detect signals, score opportunities, explain reasoning with specific dollar amounts, and suggest actions for advisor review.
          </p>
          <p className="text-sm text-gray-70">
            <span className="font-semibold text-dune">The AI does not:</span> Recommend specific financial products (KYC/suitability assessment required), decide whether to contact a client, assume risk tolerance or personal goals, or provide financial advice.
          </p>
        </div>
      </Card>
    </div>
  );
}
