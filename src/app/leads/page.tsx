import Link from "next/link";
import db from "@/lib/data/db";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ScoreBar from "@/components/ui/ScoreBar";
import { computeQualificationScore } from "@/lib/scoring/compute";
import {
  formatCurrency,
  getStatusColor,
  getTierBadgeColor,
  getVerticalLabel,
} from "@/lib/utils/formatting";

interface LeadRow {
  id: string;
  first_name: string;
  last_name: string;
  city: string;
  province: string;
  occupation: string;
  annual_income: number;
  total_balance: number;
  score: number;
  confidence: string;
  signals: string;
  status: string;
}

export const dynamic = "force-dynamic";

export default function LeadsPage() {
  const rows = db.prepare(`
    SELECT
      c.id, c.first_name, c.last_name, c.city, c.province,
      c.occupation, c.annual_income, c.total_balance,
      a.score, a.confidence, a.signals,
      ls.status
    FROM clients c
    LEFT JOIN analyses a ON c.id = a.client_id
    LEFT JOIN lead_status ls ON c.id = ls.client_id
  `).all() as LeadRow[];

  // Compute qualification scores for all leads
  const qualScores = new Map(
    rows.map(row => [row.id, computeQualificationScore(row.id)])
  );

  // Sort by composite qualification score descending
  const sortedRows = [...rows].sort((a, b) => {
    const scoreA = qualScores.get(a.id)?.compositeScore ?? 0;
    const scoreB = qualScores.get(b.id)?.compositeScore ?? 0;
    return scoreB - scoreA;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-dune">
          Leads
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-50">{rows.length} clients analyzed</p>
          <Link
            href="/leads/new"
            className="bg-ws-green text-ws-white text-sm font-medium px-4 py-2 rounded-[6px] hover:brightness-110 transition-all"
          >
            + Add New Lead
          </Link>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-10">
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">
                Client
              </th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">
                Location
              </th>
              <th className="text-center px-4 py-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">
                Tier
              </th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">
                Qualification Score
              </th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">
                Vertical
              </th>
              <th className="text-right px-4 py-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">
                Opportunity
              </th>
              <th className="text-center px-4 py-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(row => {
              const signals = JSON.parse(row.signals || "[]");
              const opportunity = signals.reduce(
                (sum: number, s: { estimatedValue: number }) => sum + (s.estimatedValue || 0), 0
              );
              const status = row.status || "new";
              const qual = qualScores.get(row.id);

              return (
                  <tr key={row.id} className="border-b border-gray-10 hover:bg-cream/50 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <Link href={`/leads/${row.id}`} className="block">
                        <p className="font-semibold text-dune text-sm">
                          {row.first_name} {row.last_name}
                        </p>
                        <p className="text-xs text-gray-50">{row.occupation}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-70">
                        {row.city}, {row.province}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {qual ? (
                        <Badge className={getTierBadgeColor(qual.tier)}>
                          Tier {qual.tier}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-30">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-4 w-40">
                      {qual ? (
                        <>
                          <div className="flex items-center gap-2">
                            <ScoreBar score={qual.compositeScore} size="sm" />
                          </div>
                          <p className="text-xs text-gray-50 mt-0.5">
                            {qual.tierLabel}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-gray-30">Not scored</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {qual ? (
                        <span className="text-xs text-gray-50 bg-gray-05 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {getVerticalLabel(qual.vertical)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-30">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-semibold text-dune">
                        {formatCurrency(opportunity)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge className={getStatusColor(status)}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link href={`/leads/${row.id}`} className="text-gray-30 text-sm hover:text-dune">&rarr;</Link>
                    </td>
                  </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
