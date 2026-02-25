import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/data/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const clientRow = db.prepare(
    "SELECT * FROM clients WHERE id = ?"
  ).get(id) as Record<string, unknown> | undefined;

  if (!clientRow) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

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
    id: clientRow.id,
    firstName: clientRow.first_name,
    lastName: clientRow.last_name,
    email: clientRow.email,
    age: clientRow.age,
    city: clientRow.city,
    province: clientRow.province,
    occupation: clientRow.occupation,
    annualIncome: clientRow.annual_income,
    accountOpenDate: clientRow.account_open_date,
    totalBalance: clientRow.total_balance,
    directDepositActive: Boolean(clientRow.direct_deposit_active),
    leadSource: clientRow.lead_source || "internal_banking",
  };

  const txns = transactions.map(t => ({
    id: t.id,
    clientId: t.client_id,
    date: t.date,
    amount: t.amount,
    description: t.description,
    category: t.category,
    merchantName: t.merchant_name,
    isRecurring: Boolean(t.is_recurring),
    type: t.type,
  }));

  const analysis = analysisRow ? {
    id: analysisRow.id,
    clientId: analysisRow.client_id,
    score: analysisRow.score,
    confidence: analysisRow.confidence,
    signals: JSON.parse(analysisRow.signals as string || "[]"),
    summary: analysisRow.summary,
    detailedReasoning: analysisRow.detailed_reasoning,
    recommendedActions: JSON.parse(analysisRow.recommended_actions as string || "[]"),
    humanDecisionRequired: analysisRow.human_decision_required,
    analyzedAt: analysisRow.analyzed_at,
    modelUsed: analysisRow.model_used,
  } : null;

  const status = statusRow ? {
    status: statusRow.status,
    advisorNotes: statusRow.advisor_notes,
    lastUpdated: statusRow.last_updated,
  } : { status: "new", advisorNotes: null, lastUpdated: null };

  return NextResponse.json({ client, transactions: txns, analysis, status });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { status, advisorNotes } = body;

  db.prepare(`
    INSERT INTO lead_status (client_id, status, advisor_notes, last_updated)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(client_id) DO UPDATE SET
      status = excluded.status,
      advisor_notes = excluded.advisor_notes,
      last_updated = excluded.last_updated
  `).run(id, status, advisorNotes || null, new Date().toISOString());

  return NextResponse.json({ success: true });
}
