import { NextResponse } from "next/server";
import db from "@/lib/data/db";

export async function GET() {
  const analyses = db.prepare(`
    SELECT a.score, a.confidence, a.signals, c.annual_income
    FROM analyses a
    JOIN clients c ON a.client_id = c.id
  `).all() as { score: number; confidence: string; signals: string; annual_income: number }[];

  const totalLeads = analyses.length;
  const highPriorityLeads = analyses.filter(a => a.score >= 80).length;
  const avgScore = totalLeads > 0
    ? Math.round(analyses.reduce((sum, a) => sum + a.score, 0) / totalLeads)
    : 0;

  // Calculate total opportunity value from all signals
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

  // Score distribution
  const ranges = [
    { range: "0-39", min: 0, max: 39 },
    { range: "40-59", min: 40, max: 59 },
    { range: "60-79", min: 60, max: 79 },
    { range: "80-100", min: 80, max: 100 },
  ];
  const scoreDistribution = ranges.map(r => ({
    range: r.range,
    count: analyses.filter(a => a.score >= r.min && a.score <= r.max).length,
  }));

  // Top signal types
  const topSignalTypes = Object.entries(signalTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  return NextResponse.json({
    totalLeads,
    highPriorityLeads,
    avgScore,
    totalOpportunityValue,
    scoreDistribution,
    topSignalTypes,
  });
}
