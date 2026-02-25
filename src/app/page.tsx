import Link from "next/link";
import db from "@/lib/data/db";
import MetricCard from "@/components/ui/MetricCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ScoreBar from "@/components/ui/ScoreBar";
import { computeAllQualificationScores } from "@/lib/scoring/compute";
import {
  formatCurrency,
  getSignalTypeLabel,
  getTierBadgeColor,
  getVerticalLabel,
} from "@/lib/utils/formatting";

interface AnalysisRow {
  score: number;
  signals: string;
}

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  occupation: string;
  city: string;
  province: string;
  lead_source: string;
}

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  // Compute qualification scores for all leads
  const qualScores = computeAllQualificationScores();
  const allClients = db.prepare("SELECT id, first_name, last_name, occupation, city, province, lead_source FROM clients").all() as ClientRow[];

  // Fetch AI analyses for signal data
  const analyses = db.prepare("SELECT a.score, a.signals FROM analyses a").all() as AnalysisRow[];

  const totalLeads = allClients.length;

  // Tier distribution from qualification scores
  const tierCounts = { A: 0, B: 0, C: 0, D: 0 };
  let totalComposite = 0;
  for (const [, score] of qualScores) {
    tierCounts[score.tier]++;
    totalComposite += score.compositeScore;
  }
  const avgComposite = qualScores.size > 0 ? Math.round(totalComposite / qualScores.size) : 0;

  // Opportunity from AI signals — split into Money In (Investing) vs Money Out (Lending)
  const MONEY_IN_SIGNALS = new Set(["competitor_rrsp", "competitor_tfsa", "competitor_investment", "large_balance_idle", "income_change"]);
  const MONEY_OUT_SIGNALS = new Set(["mortgage_refinance", "loan_ending", "competitor_insurance"]);
  let moneyInValue = 0;
  let moneyOutValue = 0;
  const signalTypeCounts: Record<string, number> = {};
  for (const a of analyses) {
    const signals = JSON.parse(a.signals || "[]");
    for (const signal of signals) {
      const value = signal.estimatedValue || 0;
      const type = signal.type || "unknown";
      if (MONEY_IN_SIGNALS.has(type)) moneyInValue += value;
      else if (MONEY_OUT_SIGNALS.has(type)) moneyOutValue += value;
      else { moneyInValue += value / 2; moneyOutValue += value / 2; }
      signalTypeCounts[type] = (signalTypeCounts[type] || 0) + 1;
    }
  }

  const topSignalTypes = Object.entries(signalTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Tier distribution data
  const tierDistribution = [
    { tier: "A", label: "Sales-Ready", color: "bg-ws-green", count: tierCounts.A },
    { tier: "B", label: "Sales-Qualified", color: "bg-ws-orange", count: tierCounts.B },
    { tier: "C", label: "Marketing-Qualified", color: "bg-ws-yellow", count: tierCounts.C },
    { tier: "D", label: "Unqualified", color: "bg-gray-30", count: tierCounts.D },
  ];

  // Vertical distribution
  const verticalCounts: Record<string, number> = {};
  for (const [, score] of qualScores) {
    verticalCounts[score.vertical] = (verticalCounts[score.vertical] || 0) + 1;
  }

  // Lead source distribution
  const SOURCE_LABELS: Record<string, string> = {
    internal_banking: "Banking",
    internal_wealth: "Wealth Mgmt",
    internal_mortgage: "Mortgage",
    external_realty: "Realty Partners",
    external_marketing: "Marketing Co.",
    external_referral: "Referrals",
    advisor_created: "Advisor Created",
  };
  const sourceCounts: Record<string, number> = {};
  for (const client of allClients) {
    const src = client.lead_source || "internal_banking";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  }

  // Top leads sorted by composite score
  const topLeads = [...allClients]
    .map(c => ({ ...c, qual: qualScores.get(c.id) }))
    .filter(c => c.qual)
    .sort((a, b) => (b.qual?.compositeScore ?? 0) - (a.qual?.compositeScore ?? 0))
    .slice(0, 4);

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-dune mb-8">
        Lead Intelligence Dashboard
      </h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <MetricCard
          label="Total Leads"
          value={String(totalLeads)}
          subtitle="Qualified clients"
        />
        <MetricCard
          label="Tier A (Sales-Ready)"
          value={String(tierCounts.A)}
          subtitle="Score 80+"
          accent="green"
        />
        <MetricCard
          label="Avg Composite Score"
          value={String(avgComposite)}
          subtitle="Across all leads"
        />
        <MetricCard
          label="Money In"
          value={formatCurrency(moneyInValue)}
          subtitle="Investing opportunity"
          accent="green"
        />
        <MetricCard
          label="Money Out"
          value={formatCurrency(moneyOutValue)}
          subtitle="Lending opportunity"
          accent="orange"
        />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Tier Distribution */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4">
            Tier Distribution
          </h2>
          <div className="space-y-3">
            {tierDistribution.map(d => (
              <div key={d.tier} className="flex items-center gap-3">
                <Badge className={getTierBadgeColor(d.tier)}>
                  <span className="w-6 text-center">{d.tier}</span>
                </Badge>
                <span className="text-sm text-gray-50 w-28">{d.label}</span>
                <div className="flex-1 h-6 bg-gray-05 rounded-[4px] overflow-hidden">
                  <div
                    className={`h-full rounded-[4px] ${d.color}`}
                    style={{ width: `${totalLeads > 0 ? (d.count / totalLeads) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-dune w-6 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Signal Types + Vertical Mix */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4">
            Vertical Distribution
          </h2>
          <div className="space-y-3 mb-6">
            {Object.entries(verticalCounts).map(([vertical, count]) => (
              <div key={vertical} className="flex items-center justify-between">
                <span className="text-sm text-dune">{getVerticalLabel(vertical)}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-05 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ws-green rounded-full"
                      style={{ width: `${(count / totalLeads) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-50">{count}</span>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4 pt-4 border-t border-gray-10">
            Top Signal Types
          </h2>
          <div className="space-y-3">
            {topSignalTypes.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-dune">{getSignalTypeLabel(type)}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-05 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ws-orange rounded-full"
                      style={{ width: `${(count / totalLeads) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-50">{count}</span>
                </div>
              </div>
            ))}
            {topSignalTypes.length === 0 && (
              <p className="text-sm text-gray-30">No signals detected yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* Lead Sources */}
      <Card className="p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4">
          Lead Sources
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(sourceCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([src, count]) => (
              <div key={src} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-dune">{SOURCE_LABELS[src] || src}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-gray-05 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ws-green rounded-full"
                        style={{ width: `${totalLeads > 0 ? (count / totalLeads) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-50 w-6 text-right">{count}</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* Top Priority Leads */}
      <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4">
        Top Qualified Leads
      </h2>
      <div className="space-y-3">
        {topLeads.map(lead => (
          <Link key={lead.id} href={`/leads/${lead.id}`}>
            <Card hover className="p-5 flex items-center gap-6 cursor-pointer">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-dune">
                    {lead.first_name} {lead.last_name}
                  </h3>
                  <Badge className={getTierBadgeColor(lead.qual!.tier)}>
                    Tier {lead.qual!.tier}
                  </Badge>
                  <span className="text-xs text-gray-50 bg-gray-05 px-2 py-0.5 rounded-full">
                    {getVerticalLabel(lead.qual!.vertical)}
                  </span>
                </div>
                <p className="text-sm text-gray-50 mt-0.5">
                  {lead.occupation} &middot; {lead.city}, {lead.province}
                </p>
                <p className="text-sm text-gray-70 mt-1">
                  Composite: {lead.qual!.compositeScore} &middot; {lead.qual!.tierLabel}
                </p>
              </div>
              <div className="w-32">
                <ScoreBar score={lead.qual!.compositeScore} size="sm" />
              </div>
              <span className="text-gray-30 text-sm">Review &rarr;</span>
            </Card>
          </Link>
        ))}
        {topLeads.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-gray-50">No leads scored yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
