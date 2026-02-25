import Link from "next/link";
import db from "@/lib/data/db";
import { notFound } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ScoreBar from "@/components/ui/ScoreBar";
import AdvisorDecisionPanel from "@/components/leads/AdvisorDecisionPanel";
import NotesDropZone from "@/components/leads/NotesDropZone";
import CompetitorSignals from "@/components/leads/CompetitorSignals";
import { computeQualificationScore } from "@/lib/scoring/compute";
import type { NoteAnalysis } from "@/types";
import type { DimensionScore, CriterionResult } from "@/lib/scoring/types";
import {
  formatCurrency,
  formatCurrencyDetailed,
  formatDate,
  getScoreLabel,
  getScoreColor,
  getSignalTypeLabel,
  getSeverityColor,
  getTierBadgeColor,
  getTierScoreColor,
  getComplianceStatusColor,
  getComplianceStatusLabel,
  getVerticalLabel,
  getDimensionLabel,
  getDimensionColor,
  getDimensionBarColor,
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

  const noteAnalysisRows = db.prepare(
    "SELECT * FROM advisor_note_analyses WHERE client_id = ? ORDER BY analyzed_at DESC"
  ).all(id) as Record<string, unknown>[];

  const noteAnalyses: NoteAnalysis[] = noteAnalysisRows.map(row => ({
    id: row.id as string,
    clientId: row.client_id as string,
    notesText: row.notes_text as string,
    insights: JSON.parse(row.insights as string || "[]"),
    newSignals: JSON.parse(row.new_signals as string || "[]"),
    updatedRecommendations: JSON.parse(row.updated_recommendations as string || "[]"),
    summaryAddendum: row.summary_addendum as string,
    scoreAdjustment: row.score_adjustment as number,
    analyzedAt: row.analyzed_at as string,
  }));

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

  // Compute qualification score
  const qual = computeQualificationScore(id);

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
          <div className="flex items-center gap-3">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-dune">
              {client.firstName} {client.lastName}
            </h1>
            {qual && (
              <>
                <Badge className={`${getTierBadgeColor(qual.tier)} text-sm px-3 py-1`}>
                  Tier {qual.tier} &mdash; {qual.tierLabel}
                </Badge>
                <span className="text-xs text-gray-50 bg-gray-05 px-2 py-0.5 rounded-full">
                  {getVerticalLabel(qual.vertical)}
                </span>
              </>
            )}
          </div>
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

        {qual && (
          <div className="text-right">
            <div className={`font-[family-name:var(--font-display)] text-5xl font-bold ${getTierScoreColor(qual.tier)}`}>
              {qual.compositeScore}
            </div>
            <p className="text-sm text-gray-50">Composite Score</p>
            <Badge className={`mt-1 ${getComplianceStatusColor(qual.complianceGate)}`}>
              Compliance: {getComplianceStatusLabel(qual.complianceGate)}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* LEFT: Qualification + AI Analysis — 2 columns */}
        <div className="col-span-2 space-y-6">
          {/* Qualification Score Breakdown */}
          {qual && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4">
                Lead Qualification &mdash; 5-Dimension Breakdown
              </h2>
              <div className="space-y-4">
                {qual.dimensions.map((dim: DimensionScore) => (
                  <div key={dim.dimension}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${getDimensionColor(dim.dimension)}`} />
                        <span className="text-sm font-medium text-dune">
                          {getDimensionLabel(dim.dimension)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-50">
                          Raw: <span className="font-semibold text-dune">{dim.rawScore}</span>/100
                        </span>
                        <span className="text-gray-30">|</span>
                        <span className="text-gray-50">
                          Weight: <span className="font-semibold text-dune">{(dim.weight * 100).toFixed(0)}%</span>
                        </span>
                        <span className="text-gray-30">|</span>
                        <span className="text-gray-50">
                          Weighted: <span className="font-semibold text-dune">{dim.weightedScore.toFixed(1)}</span>
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getDimensionColor(dim.dimension)} transition-all duration-500`}
                        style={{ width: `${dim.rawScore}%` }}
                      />
                    </div>
                    {/* Criteria details (collapsible feel — show inline) */}
                    <div className="mt-2 ml-5 space-y-1">
                      {dim.criteriaResults.map((cr: CriterionResult, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-gray-50">{cr.name.replace(/_/g, " ")}</span>
                          <div className="flex items-center gap-2">
                            <span className={cr.awardedPoints >= cr.maxPoints * 0.7 ? "text-ws-green font-medium" : cr.awardedPoints >= cr.maxPoints * 0.4 ? "text-ws-orange font-medium" : "text-gray-50"}>
                              {cr.awardedPoints}/{cr.maxPoints}
                            </span>
                            <span className="text-gray-30 max-w-[280px] truncate" title={cr.reason}>
                              {cr.reason}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Negative adjustments */}
              {qual.negativeAdjustments.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-10">
                  <h3 className="text-xs font-semibold text-ws-red uppercase tracking-wider mb-2">
                    Negative Adjustments ({qual.totalNegativePoints} pts)
                  </h3>
                  {qual.negativeAdjustments.map((neg, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1">
                      <span className="text-gray-70">{neg.signal.replace(/_/g, " ")}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-ws-red font-medium">{neg.points}</span>
                        <span className="text-gray-30">{neg.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Composite summary bar */}
              <div className="mt-6 pt-4 border-t border-gray-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-dune">Composite Score</span>
                  <span className={`text-lg font-bold ${getTierScoreColor(qual.tier)}`}>{qual.compositeScore}</span>
                </div>
                <ScoreBar score={qual.compositeScore} size="lg" showLabel={false} />
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-50">
                  <span>0&ndash;39: Tier D (Unqualified)</span>
                  <span>40&ndash;59: Tier C (Marketing-Qualified)</span>
                  <span>60&ndash;79: Tier B (Sales-Qualified)</span>
                  <span>80&ndash;100: Tier A (Sales-Ready)</span>
                </div>
              </div>
            </Card>
          )}

          {/* AI Summary */}
          {analysis && (
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
          )}

          {/* Detected Signals — with competitor comparison buttons */}
          {analysis && analysis.signals.length > 0 && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4">
                Detected Signals
              </h2>
              <CompetitorSignals
                signals={analysis.signals}
                clientContext={{
                  annualIncome: client.annualIncome,
                  totalBalance: client.totalBalance,
                  age: client.age,
                  province: client.province,
                }}
              />
            </Card>
          )}

          {/* Transaction History */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4">
              Transaction History
            </h2>
            <div className="max-h-[400px] overflow-y-auto pr-2" style={{ scrollbarGutter: "stable" }}>
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
          {analysis && (
            <div className="bg-cream border-2 border-ws-orange/30 rounded-[8px] p-6">
              <div className="flex items-center gap-2 mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L18 18H2L10 2Z" stroke="#E8661A" strokeWidth="1.5" fill="none" />
                  <path d="M10 8V12" stroke="#E8661A" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="10" cy="15" r="0.75" fill="#E8661A" />
                </svg>
                <h2 className="text-sm font-semibold text-ws-orange uppercase tracking-wider">
                  Lead Qualification
                </h2>
              </div>
              <p className="text-sm text-gray-70 leading-relaxed">
                {analysis.humanDecisionRequired}
              </p>

              <AdvisorDecisionPanel
                clientId={id}
                currentStatus={status}
              />
            </div>
          )}

          {/* Meeting Notes Upload */}
          <NotesDropZone clientId={id} clientName={`${client.firstName} ${client.lastName}`} existingAnalyses={noteAnalyses} />

          {/* Recommended Actions */}
          {analysis && (
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
          )}

          {/* Qualification Summary Card */}
          {qual && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4">
                Qualification Summary
              </h2>
              <ScoreBar score={qual.compositeScore} size="lg" />
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-50">Tier</span>
                  <Badge className={getTierBadgeColor(qual.tier)}>
                    {qual.tier} &mdash; {qual.tierLabel}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-50">Vertical</span>
                  <span className="font-medium text-dune">{getVerticalLabel(qual.vertical)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-50">Compliance Gate</span>
                  <Badge className={getComplianceStatusColor(qual.complianceGate)}>
                    {getComplianceStatusLabel(qual.complianceGate)}
                  </Badge>
                </div>
                {analysis && (
                  <>
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
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-50">Scored At</span>
                  <span className="font-medium text-dune text-xs">{qual.scoredAt.slice(0, 10)}</span>
                </div>
              </div>
            </Card>
          )}

          {/* AI Score (legacy, if available but no qual) */}
          {analysis && !qual && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4">
                AI Score
              </h2>
              <ScoreBar score={analysis.score} size="lg" />
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-50">Confidence</span>
                  <span className="font-medium text-dune capitalize">{analysis.confidence}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {!analysis && !qual && (
        <Card className="p-12 text-center mt-6">
          <p className="text-gray-50 text-lg">No analysis available for this client yet.</p>
          <p className="text-gray-30 text-sm mt-2">Run the analysis script to generate insights.</p>
        </Card>
      )}
    </div>
  );
}
