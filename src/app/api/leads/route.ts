import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/data/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sort = searchParams.get("sort") || "score";
  const status = searchParams.get("status");
  const minScore = searchParams.get("minScore");

  let query = `
    SELECT
      c.id, c.first_name, c.last_name, c.email, c.age, c.city, c.province,
      c.occupation, c.annual_income, c.account_open_date, c.total_balance,
      c.direct_deposit_active,
      a.score, a.confidence, a.summary, a.signals,
      ls.status, ls.last_updated as status_updated
    FROM clients c
    LEFT JOIN analyses a ON c.id = a.client_id
    LEFT JOIN lead_status ls ON c.id = ls.client_id
    WHERE 1=1
  `;

  const params: (string | number)[] = [];

  if (status) {
    query += " AND ls.status = ?";
    params.push(status);
  }

  if (minScore) {
    query += " AND a.score >= ?";
    params.push(Number(minScore));
  }

  const orderMap: Record<string, string> = {
    score: "a.score DESC",
    name: "c.last_name ASC",
    income: "c.annual_income DESC",
    balance: "c.total_balance DESC",
  };
  query += ` ORDER BY ${orderMap[sort] || "a.score DESC"}`;

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  const leads = rows.map(row => {
    const signals = row.signals ? JSON.parse(row.signals as string) : [];
    const topSignal = signals.length > 0
      ? signals.sort((a: { severity: string }, b: { severity: string }) => {
          const order = { high: 0, medium: 1, low: 2 };
          return (order[a.severity as keyof typeof order] ?? 2) - (order[b.severity as keyof typeof order] ?? 2);
        })[0]
      : null;

    return {
      client: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        age: row.age,
        city: row.city,
        province: row.province,
        occupation: row.occupation,
        annualIncome: row.annual_income,
        accountOpenDate: row.account_open_date,
        totalBalance: row.total_balance,
        directDepositActive: Boolean(row.direct_deposit_active),
      },
      score: row.score ?? 0,
      confidence: row.confidence ?? "low",
      topSignal: topSignal?.description ?? "No signals detected",
      estimatedOpportunity: signals.reduce((sum: number, s: { estimatedValue: number }) => sum + (s.estimatedValue || 0), 0),
      status: row.status ?? "new",
      analyzedAt: row.status_updated ?? "",
    };
  });

  return NextResponse.json({ leads, total: leads.length });
}
