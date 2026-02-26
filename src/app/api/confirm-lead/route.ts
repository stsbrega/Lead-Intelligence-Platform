import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/data/db";
import { analyzeNotes } from "@/lib/ai/notes-analyzer";
import { analyzeClient } from "@/lib/ai/engine";
import { findPotentialDuplicates, titleCase } from "@/lib/data/duplicate-check";
import type { Client, Transaction } from "@/types";

/**
 * Phase 2 of the two-phase lead creation flow.
 *
 * After the AI analyzes a document and potential duplicates are shown to the
 * advisor, this endpoint handles the confirmed decision:
 *   - "create_new"         → insert a new client (with race-condition re-check)
 *   - "attach_to_existing" → merge notes onto an existing client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, pendingLead, existingClientId } = body;

    if (!action || !pendingLead) {
      return NextResponse.json(
        { error: "action and pendingLead are required" },
        { status: 400 }
      );
    }

    const { clientProfile, analysis, modelUsed, notesText, bankData } = pendingLead;

    if (action === "create_new") {
      // ── Race-condition guard: re-check for duplicates ──────────────────
      const freshDuplicates = findPotentialDuplicates(
        clientProfile.firstName,
        clientProfile.lastName,
        {
          city: clientProfile.city,
          province: clientProfile.province,
          occupation: clientProfile.occupation,
          age: clientProfile.estimatedAge,
        }
      );

      // Only re-prompt if NEW exact/high-confidence matches appeared
      const highConfidence = freshDuplicates.filter(
        (d) => d.matchConfidence === "exact" || d.matchConfidence === "high"
      );
      if (highConfidence.length > 0) {
        // Check if these are genuinely new (not the ones already shown)
        const previousIds = new Set((body.previousDuplicateIds as string[]) || []);
        const newMatches = highConfidence.filter((d) => !previousIds.has(d.clientId));
        if (newMatches.length > 0) {
          return NextResponse.json({
            requiresConfirmation: true,
            pendingLead,
            duplicates: freshDuplicates,
          });
        }
      }

      // ── Create new client ─────────────────────────────────────────────
      const newClientId = `c_notes_${Date.now()}`;
      const now = new Date().toISOString();
      const analysisId = `analysis_${newClientId}`;

      const firstName = titleCase(clientProfile.firstName);
      const lastName = titleCase(clientProfile.lastName);

      db.prepare(`
        INSERT INTO clients (id, first_name, last_name, email, age, city, province, occupation, annual_income, account_open_date, total_balance, direct_deposit_active, lead_source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newClientId,
        firstName,
        lastName,
        "",
        clientProfile.estimatedAge || 0,
        clientProfile.city || "Unknown",
        clientProfile.province || "ON",
        clientProfile.occupation || "",
        clientProfile.estimatedAnnualIncome || 0,
        now.split("T")[0],
        0,
        0,
        "advisor_created"
      );

      db.prepare(`
        INSERT INTO analyses (id, client_id, score, confidence, signals, summary, detailed_reasoning, recommended_actions, human_decision_required, analyzed_at, model_used)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        analysisId,
        newClientId,
        analysis.score,
        analysis.confidence,
        JSON.stringify(analysis.signals),
        analysis.summary,
        analysis.detailedReasoning,
        JSON.stringify(analysis.recommendedActions),
        analysis.humanDecisionRequired,
        now,
        modelUsed
      );

      db.prepare(`
        INSERT INTO lead_status (client_id, status, advisor_notes, last_updated)
        VALUES (?, ?, ?, ?)
      `).run(newClientId, "new", "", now);

      // ── Bank statement: insert transactions + re-run full analysis ───────
      if (bankData && Array.isArray(bankData.transactions) && bankData.transactions.length > 0) {
        const insertTxn = db.prepare(`
          INSERT INTO transactions (id, client_id, date, amount, description, category, merchant_name, is_recurring, type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertMany = db.transaction((txns: typeof bankData.transactions) => {
          for (let i = 0; i < txns.length; i++) {
            const t = txns[i];
            insertTxn.run(
              `txn_${newClientId}_stmt_${Date.now()}_${i}`,
              newClientId,
              t.date, t.amount, t.description, t.category,
              t.merchantName, t.isRecurring ? 1 : 0, t.type
            );
          }
        });
        insertMany(bankData.transactions);

        // Update client balance from statement closing balance
        if (bankData.summary?.closingBalance) {
          db.prepare("UPDATE clients SET total_balance = ? WHERE id = ?")
            .run(bankData.summary.closingBalance, newClientId);
        }

        // Reload client + transactions for proper AI analysis
        const cRow = db.prepare("SELECT * FROM clients WHERE id = ?").get(newClientId) as Record<string, unknown>;
        const client: Client = {
          id: cRow.id as string,
          firstName: cRow.first_name as string,
          lastName: cRow.last_name as string,
          email: (cRow.email as string) || "",
          age: cRow.age as number,
          city: cRow.city as string,
          province: cRow.province as string,
          occupation: cRow.occupation as string,
          annualIncome: cRow.annual_income as number,
          accountOpenDate: cRow.account_open_date as string,
          totalBalance: cRow.total_balance as number,
          directDepositActive: Boolean(cRow.direct_deposit_active),
        };

        const allTxnRows = db.prepare(
          "SELECT * FROM transactions WHERE client_id = ? ORDER BY date DESC"
        ).all(newClientId) as Record<string, unknown>[];

        const allTransactions: Transaction[] = allTxnRows.map((t) => ({
          id: t.id as string,
          clientId: t.client_id as string,
          date: t.date as string,
          amount: t.amount as number,
          description: (t.description as string) || "",
          category: t.category as Transaction["category"],
          merchantName: (t.merchant_name as string) || "",
          isRecurring: Boolean(t.is_recurring),
          type: t.type as Transaction["type"],
        }));

        // Re-run full AI analysis with actual transaction data.
        // Wrapped in try-catch so the lead creation succeeds even if
        // the AI re-analysis call fails (transactions are already saved).
        let finalScore = analysis.score;
        try {
          const newAnalysis = await analyzeClient(client, allTransactions);

          db.prepare(`
            UPDATE analyses SET score = ?, confidence = ?, signals = ?, summary = ?,
              detailed_reasoning = ?, recommended_actions = ?, human_decision_required = ?,
              analyzed_at = ?, model_used = ?
            WHERE client_id = ?
          `).run(
            newAnalysis.score, newAnalysis.confidence, JSON.stringify(newAnalysis.signals),
            newAnalysis.summary, newAnalysis.detailedReasoning,
            JSON.stringify(newAnalysis.recommendedActions), newAnalysis.humanDecisionRequired,
            newAnalysis.analyzedAt, newAnalysis.modelUsed, newClientId
          );
          finalScore = newAnalysis.score;
        } catch (reanalysisErr) {
          console.error("[confirm-lead] Re-analysis failed for new lead (transactions saved):", reanalysisErr);
        }

        return NextResponse.json({
          clientId: newClientId,
          clientName: `${firstName} ${lastName}`,
          score: finalScore,
        });
      }

      return NextResponse.json({
        clientId: newClientId,
        clientName: `${firstName} ${lastName}`,
        score: analysis.score,
      });
    }

    if (action === "attach_to_existing") {
      if (!existingClientId) {
        return NextResponse.json(
          { error: "existingClientId is required for attach_to_existing" },
          { status: 400 }
        );
      }

      // ── Verify the existing client ────────────────────────────────────
      const clientRow = db
        .prepare("SELECT first_name, last_name FROM clients WHERE id = ?")
        .get(existingClientId) as { first_name: string; last_name: string } | undefined;

      if (!clientRow) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }

      const clientName = `${clientRow.first_name} ${clientRow.last_name}`;

      // ── Bank statement: insert transactions + re-analyze ────────────
      if (bankData && Array.isArray(bankData.transactions) && bankData.transactions.length > 0) {
        // Deduplicate against existing transactions
        const existingKeys = new Set(
          (db.prepare(
            "SELECT date || '|' || amount || '|' || description AS key FROM transactions WHERE client_id = ?"
          ).all(existingClientId) as { key: string }[]).map((r) => r.key)
        );

        const newTxns = bankData.transactions.filter((txn: { date: string; amount: number; description: string }) => {
          const key = `${txn.date}|${txn.amount}|${txn.description}`;
          return !existingKeys.has(key);
        });

        if (newTxns.length > 0) {
          const insertTxn = db.prepare(`
            INSERT INTO transactions (id, client_id, date, amount, description, category, merchant_name, is_recurring, type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const insertMany = db.transaction((txns: typeof newTxns) => {
            for (let i = 0; i < txns.length; i++) {
              const t = txns[i];
              insertTxn.run(
                `txn_${existingClientId}_stmt_${Date.now()}_${i}`,
                existingClientId,
                t.date, t.amount, t.description, t.category,
                t.merchantName, t.isRecurring ? 1 : 0, t.type
              );
            }
          });
          insertMany(newTxns);
        }

        // Update client balance
        if (bankData.summary?.closingBalance) {
          db.prepare("UPDATE clients SET total_balance = ? WHERE id = ?")
            .run(bankData.summary.closingBalance, existingClientId);
        }

        // Reload client + all transactions for re-analysis
        const cRow = db.prepare("SELECT * FROM clients WHERE id = ?").get(existingClientId) as Record<string, unknown>;
        const client: Client = {
          id: cRow.id as string,
          firstName: cRow.first_name as string,
          lastName: cRow.last_name as string,
          email: (cRow.email as string) || "",
          age: cRow.age as number,
          city: cRow.city as string,
          province: cRow.province as string,
          occupation: cRow.occupation as string,
          annualIncome: cRow.annual_income as number,
          accountOpenDate: cRow.account_open_date as string,
          totalBalance: cRow.total_balance as number,
          directDepositActive: Boolean(cRow.direct_deposit_active),
        };

        const allTxnRows = db.prepare(
          "SELECT * FROM transactions WHERE client_id = ? ORDER BY date DESC"
        ).all(existingClientId) as Record<string, unknown>[];

        const allTransactions: Transaction[] = allTxnRows.map((t) => ({
          id: t.id as string,
          clientId: t.client_id as string,
          date: t.date as string,
          amount: t.amount as number,
          description: (t.description as string) || "",
          category: t.category as Transaction["category"],
          merchantName: (t.merchant_name as string) || "",
          isRecurring: Boolean(t.is_recurring),
          type: t.type as Transaction["type"],
        }));

        // Re-run full AI analysis — wrapped in try-catch so the transaction
        // insert is never lost even if re-analysis fails.
        try {
          const newAnalysis = await analyzeClient(client, allTransactions);

          db.prepare(`
            INSERT INTO analyses (id, client_id, score, confidence, signals, summary,
              detailed_reasoning, recommended_actions, human_decision_required, analyzed_at, model_used)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(client_id) DO UPDATE SET
              score = excluded.score, confidence = excluded.confidence, signals = excluded.signals,
              summary = excluded.summary, detailed_reasoning = excluded.detailed_reasoning,
              recommended_actions = excluded.recommended_actions,
              human_decision_required = excluded.human_decision_required,
              analyzed_at = excluded.analyzed_at, model_used = excluded.model_used
          `).run(
            newAnalysis.id, newAnalysis.clientId, newAnalysis.score, newAnalysis.confidence,
            JSON.stringify(newAnalysis.signals), newAnalysis.summary, newAnalysis.detailedReasoning,
            JSON.stringify(newAnalysis.recommendedActions), newAnalysis.humanDecisionRequired,
            newAnalysis.analyzedAt, newAnalysis.modelUsed
          );
        } catch (reanalysisErr) {
          console.error("[confirm-lead] Re-analysis failed for attach_to_existing (transactions saved):", reanalysisErr);
        }

        return NextResponse.json({
          clientId: existingClientId,
          clientName,
          merged: true,
        });
      }

      // ── Meeting notes: run same-client notes analysis ──────────────
      const analysisRow = db
        .prepare("SELECT summary, score, signals FROM analyses WHERE client_id = ?")
        .get(existingClientId) as
        | { summary: string; score: number; signals: string }
        | undefined;

      const noteResult = await analyzeNotes(
        clientName,
        analysisRow?.summary ?? null,
        analysisRow?.score ?? null,
        notesText
      );

      // ── Insert note analysis ──────────────────────────────────────────
      const noteId = `note_${existingClientId}_${Date.now()}`;
      const analyzedAt = new Date().toISOString();

      db.prepare(`
        INSERT INTO advisor_note_analyses (id, client_id, notes_text, insights, new_signals, updated_recommendations, summary_addendum, score_adjustment, analyzed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        noteId,
        existingClientId,
        notesText,
        JSON.stringify(noteResult.insights),
        JSON.stringify(noteResult.newSignals),
        JSON.stringify(noteResult.updatedRecommendations),
        noteResult.summaryAddendum,
        noteResult.scoreAdjustment,
        analyzedAt
      );

      // ── Merge score adjustment + signals into main analysis ───────────
      if (analysisRow) {
        if (noteResult.scoreAdjustment !== 0) {
          const newScore = Math.max(0, Math.min(100, analysisRow.score + noteResult.scoreAdjustment));
          db.prepare("UPDATE analyses SET score = ? WHERE client_id = ?").run(newScore, existingClientId);
        }
        if (noteResult.newSignals.length > 0) {
          const existing = JSON.parse(analysisRow.signals || "[]");
          const merged = [
            ...existing,
            ...noteResult.newSignals.map((s: { type: string; description: string; severity: string }) => ({
              ...s,
              estimatedValue: 0,
              relatedTransactionIds: [],
            })),
          ];
          db.prepare("UPDATE analyses SET signals = ? WHERE client_id = ?").run(
            JSON.stringify(merged),
            existingClientId
          );
        }
      }

      return NextResponse.json({
        clientId: existingClientId,
        clientName,
        merged: true,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Expected "create_new" or "attach_to_existing"` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Confirm lead failed:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to confirm lead: ${detail}` }, { status: 500 });
  }
}
