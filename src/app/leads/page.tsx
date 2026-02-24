import Link from "next/link";
import db from "@/lib/data/db";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ScoreBar from "@/components/ui/ScoreBar";
import { formatCurrency, getStatusColor, getScoreLabel } from "@/lib/utils/formatting";

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
    ORDER BY a.score DESC
  `).all() as LeadRow[];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-dune">
          Leads
        </h1>
        <p className="text-sm text-gray-50">{rows.length} clients analyzed</p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-10">
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">
                Client
              </th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">
                Location
              </th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">
                Score
              </th>
              <th className="text-left px-4 py-4 text-xs font-semibold text-gray-50 uppercase tracking-wider">
                Top Signal
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
            {rows.map(row => {
              const signals = JSON.parse(row.signals || "[]");
              const topSignal = signals.sort(
                (a: { severity: string }, b: { severity: string }) => {
                  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
                  return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
                }
              )[0];
              const opportunity = signals.reduce(
                (sum: number, s: { estimatedValue: number }) => sum + (s.estimatedValue || 0), 0
              );
              const status = row.status || "new";

              return (
                <Link
                  key={row.id}
                  href={`/leads/${row.id}`}
                  className="contents"
                >
                  <tr className="border-b border-gray-10 hover:bg-cream/50 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-dune text-sm">
                          {row.first_name} {row.last_name}
                        </p>
                        <p className="text-xs text-gray-50">{row.occupation}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-70">
                        {row.city}, {row.province}
                      </span>
                    </td>
                    <td className="px-4 py-4 w-36">
                      <div className="flex items-center gap-2">
                        <ScoreBar score={row.score ?? 0} size="sm" />
                      </div>
                      <p className="text-xs text-gray-50 mt-0.5">
                        {getScoreLabel(row.score ?? 0)}
                      </p>
                    </td>
                    <td className="px-4 py-4 max-w-[200px]">
                      <p className="text-sm text-gray-70 truncate">
                        {topSignal?.description || "—"}
                      </p>
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
                      <span className="text-gray-30 text-sm">&rarr;</span>
                    </td>
                  </tr>
                </Link>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
