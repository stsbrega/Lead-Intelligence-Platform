import Link from "next/link";
import db from "@/lib/data/db";
import MetricCard from "@/components/ui/MetricCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ScoreBar from "@/components/ui/ScoreBar";
import { formatCurrency, getScoreColor, getSignalTypeLabel } from "@/lib/utils/formatting";

interface AnalysisRow {
  score: number;
  signals: string;
}

interface LeadRow {
  id: string;
  first_name: string;
  last_name: string;
  occupation: string;
  city: string;
  province: string;
  score: number;
  summary: string;
  signals: string;
}

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  // Fetch metrics
  const analyses = db.prepare(`
    SELECT a.score, a.signals
    FROM analyses a
  `).all() as AnalysisRow[];

  const totalLeads = analyses.length;
  const highPriorityLeads = analyses.filter(a => a.score >= 80).length;
  const avgScore = totalLeads > 0
    ? Math.round(analyses.reduce((sum, a) => sum + a.score, 0) / totalLeads)
    : 0;

  let totalOpportunityValue = 0;
  const signalTypeCounts: Record<string, number> = {};

  for (const a of analyses) {
    const signals = JSON.parse(a.signals || "[]");
    for (const signal of signals) {
      totalOpportunityValue += signal.estimatedValue || 0;
      const type = signal.type || "unknown";
      signalTypeCounts[type] = (signalTypeCounts[type] || 0) + 1;
    }
  }

  const scoreDistribution = [
    { range: "80-100", min: 80, max: 100, label: "High" },
    { range: "60-79", min: 60, max: 79, label: "Medium" },
    { range: "40-59", min: 40, max: 59, label: "Emerging" },
    { range: "0-39", min: 0, max: 39, label: "Low" },
  ].map(r => ({
    ...r,
    count: analyses.filter(a => a.score >= r.min && a.score <= r.max).length,
  }));

  const topSignalTypes = Object.entries(signalTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Top leads
  const topLeads = db.prepare(`
    SELECT c.id, c.first_name, c.last_name, c.occupation, c.city, c.province,
           a.score, a.summary, a.signals
    FROM clients c
    JOIN analyses a ON c.id = a.client_id
    ORDER BY a.score DESC
    LIMIT 4
  `).all() as LeadRow[];

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-dune mb-8">
        Lead Intelligence Dashboard
      </h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total Leads"
          value={String(totalLeads)}
          subtitle="Analyzed clients"
        />
        <MetricCard
          label="High Priority"
          value={String(highPriorityLeads)}
          subtitle="Score 80+"
          accent="green"
        />
        <MetricCard
          label="Avg Score"
          value={String(avgScore)}
          subtitle="Across all leads"
        />
        <MetricCard
          label="Total Opportunity"
          value={formatCurrency(totalOpportunityValue)}
          subtitle="Estimated AUM potential"
          accent="orange"
        />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Score Distribution */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4">
            Score Distribution
          </h2>
          <div className="space-y-3">
            {scoreDistribution.map(d => (
              <div key={d.range} className="flex items-center gap-3">
                <span className="text-sm text-gray-50 w-16">{d.label}</span>
                <div className="flex-1 h-6 bg-gray-05 rounded-[4px] overflow-hidden">
                  <div
                    className={`h-full rounded-[4px] ${
                      d.min >= 80 ? "bg-ws-green" : d.min >= 60 ? "bg-ws-orange" : d.min >= 40 ? "bg-ws-yellow" : "bg-gray-30"
                    }`}
                    style={{ width: `${totalLeads > 0 ? (d.count / totalLeads) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-dune w-6 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Signal Types */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4">
            Top Signal Types
          </h2>
          <div className="space-y-3">
            {topSignalTypes.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-dune">{getSignalTypeLabel(type)}</span>
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
            {topSignalTypes.length === 0 && (
              <p className="text-sm text-gray-30">No signals detected yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* Top Priority Leads */}
      <h2 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-4">
        High Priority Leads
      </h2>
      <div className="space-y-3">
        {topLeads.map(lead => {
          const signals = JSON.parse(lead.signals || "[]");
          const topSignal = signals[0];

          return (
            <Link key={lead.id} href={`/leads/${lead.id}`}>
              <Card hover className="p-5 flex items-center gap-6 cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-dune">
                      {lead.first_name} {lead.last_name}
                    </h3>
                    <Badge className={`${lead.score >= 80 ? "bg-ws-green-light text-ws-green-dark" : "bg-ws-orange-light text-ws-orange"}`}>
                      Score {lead.score}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-50 mt-0.5">
                    {lead.occupation} &middot; {lead.city}, {lead.province}
                  </p>
                  <p className="text-sm text-gray-70 mt-1 truncate">
                    {lead.summary}
                  </p>
                </div>
                <div className="w-32">
                  <ScoreBar score={lead.score} size="sm" />
                </div>
                <span className="text-gray-30 text-sm">Review &rarr;</span>
              </Card>
            </Link>
          );
        })}
        {topLeads.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-gray-50">No leads analyzed yet. Run the AI analysis first.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
