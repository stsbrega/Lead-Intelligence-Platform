import Link from "next/link";
import db from "@/lib/data/db";
import { notFound } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ScoreBar from "@/components/ui/ScoreBar";
import AdvisorDecisionPanel from "@/components/leads/AdvisorDecisionPanel";
import {
  formatCurrency,
  formatCurrencyDetailed,
  formatDate,
  getScoreLabel,
  getScoreColor,
  getSignalTypeLabel,
  getSeverityColor,
} from "@/lib/utils/formatting";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;

  const clientRow = db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!clientRow) notFound();

  const transactions = db.prepare(
    "SELECT * FROM transactions WHERE client_id = ? ORDER BY date DESC"
  ).all(id) as Record<string, unknown>[];

  const analysisRow = db.prepare(
    "SELECT * FROM analyses WHERE client_id = ?"
  ).get(id) as Record<string, unknown> | undefined;

  const statusRow = db.prepare(
    "SELECT * FROM lead_status WHERE client_id = ?"
  ).get(id) as Record<string, unknown> | undefined;

  const client = {
    firstName: clientRow.first_name as string,
    lastName: clientRow.last_name as string,
    occupation: clientRow.occupation as string,
    city: clientRow.city as string,
    province: clientRow.province as string,
    annualIncome: clientRow.annual_income as number,
    totalBalance: clientRow.total_balance as number,
    age: clientRow.age as number,
    accountOpenDate: clientRow.account_open_date as string,
    directDepositActive: Boolean(clientRow.direct_deposit_active),
  };

  const analysis = analysisRow ? {
    score: analysisRow.score as number,
    confidence: analysisRow.confidence as string,
    summary: analysisRow.summary as string,
    detailedReasoning: analysisRow.detailed_reasoning as string,
    signals: JSON.parse(analysisRow.signals as string || "[]"),
    recommendedActions: JSON.parse(analysisRow.recommended_actions as string || "[]"),
    humanDecisionRequired: analysisRow.human_decision_required as string,
    modelUsed: analysisRow.model_used as string,
    analyzedAt: analysisRow.analyzed_at as string,
  } : null;

  const status = (statusRow?.status as string) || "new";
  const advisorNotes = (statusRow?.advisor_notes as string) || "";

  // Categorize transactions for display
  const signalCategories = [
    "investment_competitor", "rrsp_contribution", "tfsa_contribution",
    "mortgage_payment", "insurance_premium", "large_transfer", "loan_payment",
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <Link href="/leads" className="text-sm text-gray-50 hover:text-dune transition-colors">
        &larr; Back to Leads
      </Link>

      {/* Client Header */}
      <div className="mt-4 mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-dune">
            {client.firstName} {client.lastName}
          </h1>
          <p className="text-gray-50 mt-1">
            {client.occupation} &middot; {client.city}, {client.province} &middot; Age {client.age}
          </p>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-gray-50">
              Income: <span className="font-semibold text-dune">{formatCurrency(client.annualIncome)}</span>
            </span>
            <span className="text-gray-50">
              Balance: <span className="font-semibold text-dune">{formatCurrency(client.totalBalance)}</span>
            </span>
            <span className="text-gray-50">
              Client since: <span className="font-semibold text-dune">{formatDate(client.accountOpenDate)}</span>
            </span>
            {client.directDepositActive && (
              <Badge className="bg-ws-green-light text-ws-green-dark">Direct Deposit Active</Badge>
            )}
          </div>
        </div>

        {analysis && (
          <div className="text-right">
            <div className={`font-[family-name:var(--font-display)] text-5xl font-bold ${getScoreColor(analysis.score)}`}>
              {analysis.score}
            </div>
            <p className="text-sm text-gray-50">{getScoreLabel(analysis.score)}</p>
            <p className="text-xs text-gray-30 mt-0.5">Confidence: {analysis.confidence}</p>
          </div>
        )}
      </div>

      {analysis ? (
        <div className="grid grid-cols-3 gap-6">
          {/* LEFT: AI Analysis — 2 columns */}
          <div className="col-span-2 space-y-6">
            {/* AI Summary */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-ws-green animate-pulse" />
                <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider">
                  AI Analysis
                </h2>
                <span className="text-xs text-gray-30 ml-auto">
                  {analysis.modelUsed} &middot; {formatDate(analysis.analyzedAt)}
                </span>
              </div>
              <p className="text-dune leading-relaxed">{analysis.summary}</p>
              <div className="mt-4 pt-4 border-t border-gray-10">
                <p className="text-sm text-gray-70 leading-relaxed whitespace-pre-line">
                  {analysis.detailedReasoning}
                </p>
              </div>
            </Card>

            {/* Detected Signals */}
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4">
                Detected Signals
              </h2>
              <div className="space-y-3">
                {analysis.signals.map((signal: {
                  type: string;
                  description: string;
                  severity: string;
                  estimatedValue: number;
                }, i: number) => (
                  <div
                    key={i}
                    className={`border-l-4 rounded-[6px] p-4 ${getSeverityColor(signal.severity)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-gray-50 uppercase">
                          {getSignalTypeLabel(signal.type)}
                        </span>
                        <p className="text-sm text-dune mt-0.5">{signal.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-dune">
                          {formatCurrency(signal.estimatedValue)}
                        </p>
                        <p className="text-xs text-gray-50">est. annual value</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Transaction History */}
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4">
                Transaction History
              </h2>
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-ws-white">
                    <tr className="border-b border-gray-10">
                      <th className="text-left py-2 text-xs font-semibold text-gray-50">Date</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-50">Description</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-50">Category</th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-50">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(txn => {
                      const isSignal = signalCategories.includes(txn.category as string);
                      return (
                        <tr
                          key={txn.id as string}
                          className={`border-b border-gray-10/50 ${
                            isSignal ? "bg-ws-orange-light/30" : ""
                          }`}
                        >
                          <td className="py-2.5 text-sm text-gray-50 whitespace-nowrap">
                            {formatDate(txn.date as string)}
                          </td>
                          <td className="py-2.5 text-sm text-dune">
                            {txn.description as string}
                            {isSignal && (
                              <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-ws-orange" />
                            )}
                          </td>
                          <td className="py-2.5">
                            <span className="text-xs text-gray-50 bg-gray-05 px-2 py-0.5 rounded-full">
                              {(txn.category as string).replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className={`py-2.5 text-sm font-medium text-right ${
                            (txn.amount as number) > 0 ? "text-ws-green" : "text-dune"
                          }`}>
                            {(txn.amount as number) > 0 ? "+" : ""}{formatCurrencyDetailed(txn.amount as number)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* RIGHT: Advisor Decision + Actions — 1 column */}
          <div className="space-y-6">
            {/* CRITICAL: Human Decision Required */}
            <div className="bg-cream border-2 border-ws-orange/30 rounded-[8px] p-6">
              <div className="flex items-center gap-2 mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L18 18H2L10 2Z" stroke="#E8661A" strokeWidth="1.5" fill="none" />
                  <path d="M10 8V12" stroke="#E8661A" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="10" cy="15" r="0.75" fill="#E8661A" />
                </svg>
                <h2 className="text-sm font-semibold text-ws-orange uppercase tracking-wider">
                  Advisor Decision Required
                </h2>
              </div>
              <p className="text-sm text-gray-70 leading-relaxed">
                {analysis.humanDecisionRequired}
              </p>

              <AdvisorDecisionPanel
                clientId={id}
                currentStatus={status}
                currentNotes={advisorNotes}
              />
            </div>

            {/* Recommended Actions */}
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4">
                Recommended Actions
              </h2>
              <div className="space-y-4">
                {analysis.recommendedActions.map((action: {
                  priority: number;
                  action: string;
                  rationale: string;
                  estimatedImpact: string;
                  requiresHumanApproval: boolean;
                }, i: number) => (
                  <div key={i} className="border-b border-gray-10 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-05 flex items-center justify-center text-xs font-bold text-gray-50">
                        {action.priority}
                      </span>
                      <div>
                        <p className="font-semibold text-sm text-dune">{action.action}</p>
                        <p className="text-xs text-gray-50 mt-1">{action.rationale}</p>
                        <p className="text-xs text-ws-green font-medium mt-1">
                          {action.estimatedImpact}
                        </p>
                        {action.requiresHumanApproval && (
                          <Badge className="mt-1.5 bg-ws-orange-light text-ws-orange text-[10px]">
                            Requires Approval
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Score Breakdown */}
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4">
                Score Breakdown
              </h2>
              <ScoreBar score={analysis.score} size="lg" />
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-50">Confidence</span>
                  <span className="font-medium text-dune capitalize">{analysis.confidence}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-50">Signals Detected</span>
                  <span className="font-medium text-dune">{analysis.signals.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-50">Total Est. Value</span>
                  <span className="font-medium text-dune">
                    {formatCurrency(
                      analysis.signals.reduce(
                        (sum: number, s: { estimatedValue: number }) => sum + (s.estimatedValue || 0), 0
                      )
                    )}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-gray-50 text-lg">No AI analysis available for this client yet.</p>
          <p className="text-gray-30 text-sm mt-2">Run the analysis script to generate insights.</p>
        </Card>
      )}
    </div>
  );
}
