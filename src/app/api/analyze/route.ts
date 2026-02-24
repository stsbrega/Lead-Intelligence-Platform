import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/data/db";
import { analyzeClient } from "@/lib/ai/engine";
import type { Client, Transaction } from "@/types";

export async function POST(request: NextRequest) {
  const { clientId } = await request.json();

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const clientRow = db.prepare("SELECT * FROM clients WHERE id = ?").get(clientId) as Record<string, unknown> | undefined;
  if (!clientRow) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const client: Client = {
    id: clientRow.id as string,
    firstName: clientRow.first_name as string,
    lastName: clientRow.last_name as string,
    email: clientRow.email as string,
    age: clientRow.age as number,
    city: clientRow.city as string,
    province: clientRow.province as string,
    occupation: clientRow.occupation as string,
    annualIncome: clientRow.annual_income as number,
    accountOpenDate: clientRow.account_open_date as string,
    totalBalance: clientRow.total_balance as number,
    directDepositActive: Boolean(clientRow.direct_deposit_active),
  };

  const txnRows = db.prepare("SELECT * FROM transactions WHERE client_id = ? ORDER BY date DESC").all(clientId) as Record<string, unknown>[];
  const transactions: Transaction[] = txnRows.map(t => ({
    id: t.id as string,
    clientId: t.client_id as string,
    date: t.date as string,
    amount: t.amount as number,
    description: t.description as string,
    category: t.category as Transaction["category"],
    merchantName: t.merchant_name as string,
    isRecurring: Boolean(t.is_recurring),
    type: t.type as Transaction["type"],
  }));

  try {
    const analysis = await analyzeClient(client, transactions);

    // Store in database
    db.prepare(`
      INSERT INTO analyses (id, client_id, score, confidence, signals, summary, detailed_reasoning, recommended_actions, human_decision_required, analyzed_at, model_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(client_id) DO UPDATE SET
        score = excluded.score,
        confidence = excluded.confidence,
        signals = excluded.signals,
        summary = excluded.summary,
        detailed_reasoning = excluded.detailed_reasoning,
        recommended_actions = excluded.recommended_actions,
        human_decision_required = excluded.human_decision_required,
        analyzed_at = excluded.analyzed_at,
        model_used = excluded.model_used
    `).run(
      analysis.id,
      analysis.clientId,
      analysis.score,
      analysis.confidence,
      JSON.stringify(analysis.signals),
      analysis.summary,
      analysis.detailedReasoning,
      JSON.stringify(analysis.recommendedActions),
      analysis.humanDecisionRequired,
      analysis.analyzedAt,
      analysis.modelUsed
    );

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Analysis failed:", error);
    return NextResponse.json(
      { error: "Analysis failed. Check API key configuration." },
      { status: 500 }
    );
  }
}
