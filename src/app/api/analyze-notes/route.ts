import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/data/db";
import { analyzeNotesWithDetection } from "@/lib/ai/notes-analyzer";
import { analyzeClient } from "@/lib/ai/engine";
import { extractText, isSupportedFile } from "@/lib/file-parser";
import { findPotentialDuplicates } from "@/lib/data/duplicate-check";
import type { Client, Transaction } from "@/types";

export async function POST(request: NextRequest) {
  let clientId: string;
  let notesText: string;

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    // ── File upload path (Excel, PDF, or text-based files) ──
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    clientId = (formData.get("clientId") as string) ?? "";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 }
      );
    }

    if (!isSupportedFile(file.name)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload .txt, .docx, .xlsx, .xls, or .pdf" },
        { status: 400 }
      );
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      notesText = await extractText(buffer, file.name);
    } catch (err) {
      console.error("File parsing failed:", err);
      return NextResponse.json(
        { error: "Failed to read the uploaded file" },
        { status: 400 }
      );
    }
  } else {
    // ── Legacy JSON path ──
    const body = await request.json();
    clientId = body.clientId;
    notesText = body.notesText;
  }

  if (!clientId || !notesText) {
    return NextResponse.json(
      { error: "clientId and notesText are required" },
      { status: 400 }
    );
  }

  const clientRow = db.prepare("SELECT first_name, last_name FROM clients WHERE id = ?").get(clientId) as
    | { first_name: string; last_name: string }
    | undefined;

  if (!clientRow) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const analysisRow = db.prepare("SELECT summary, score, signals FROM analyses WHERE client_id = ?").get(clientId) as
    | { summary: string; score: number; signals: string }
    | undefined;

  try {
    const clientName = `${clientRow.first_name} ${clientRow.last_name}`;
    const detection = await analyzeNotesWithDetection(
      clientName,
      analysisRow?.summary ?? null,
      analysisRow?.score ?? null,
      notesText
    );

    if (detection.type === "same_client") {
      // ── Same client: supplementary notes analysis ──
      const result = detection.data;
      const id = `note_${clientId}_${Date.now()}`;
      const analyzedAt = new Date().toISOString();

      db.prepare(`
        INSERT INTO advisor_note_analyses (id, client_id, notes_text, insights, new_signals, updated_recommendations, summary_addendum, score_adjustment, analyzed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        clientId,
        notesText,
        JSON.stringify(result.insights),
        JSON.stringify(result.newSignals),
        JSON.stringify(result.updatedRecommendations),
        result.summaryAddendum,
        result.scoreAdjustment,
        analyzedAt
      );

      // ── Merge into main analysis: apply score adjustment + new signals ──
      if (analysisRow) {
        if (result.scoreAdjustment !== 0) {
          const newScore = Math.max(0, Math.min(100, analysisRow.score + result.scoreAdjustment));
          db.prepare("UPDATE analyses SET score = ? WHERE client_id = ?").run(newScore, clientId);
        }
        if (result.newSignals.length > 0) {
          const existing = JSON.parse(analysisRow.signals || "[]");
          const merged = [
            ...existing,
            ...result.newSignals.map((s: { type: string; description: string; severity: string }) => ({
              ...s,
              estimatedValue: 0,
              relatedTransactionIds: [],
            })),
          ];
          db.prepare("UPDATE analyses SET signals = ? WHERE client_id = ?").run(JSON.stringify(merged), clientId);
        }
      }

      return NextResponse.json({
        noteAnalysis: {
          id,
          clientId,
          notesText,
          ...result,
          analyzedAt,
        },
        pageRefreshNeeded: true,
      });
    }

    if (detection.type === "bank_statement") {
      // ── Bank statement detected ──
      const bankData = detection.data;

      // Determine whether the account holder matches the current client
      const holderFirst = bankData.accountHolder.firstName.trim().toLowerCase();
      const holderLast = bankData.accountHolder.lastName.trim().toLowerCase();
      const clientFirst = clientRow.first_name.trim().toLowerCase();
      const clientLast = clientRow.last_name.trim().toLowerCase();
      const nameMatches = holderFirst === clientFirst && holderLast === clientLast;

      if (nameMatches) {
        // ── Same person: insert transactions + re-analyze ──
        const now = new Date().toISOString();

        // Deduplicate against existing transactions
        const existingKeys = new Set(
          (db.prepare(
            "SELECT date || '|' || amount || '|' || description AS key FROM transactions WHERE client_id = ?"
          ).all(clientId) as { key: string }[]).map((r) => r.key)
        );

        const newTxns = bankData.transactions.filter((txn) => {
          const key = `${txn.date}|${txn.amount}|${txn.description}`;
          return !existingKeys.has(key);
        });

        // Insert new transactions
        const insertTxn = db.prepare(`
          INSERT INTO transactions (id, client_id, date, amount, description, category, merchant_name, is_recurring, type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertMany = db.transaction((txns: typeof newTxns) => {
          for (let i = 0; i < txns.length; i++) {
            const t = txns[i];
            insertTxn.run(
              `txn_${clientId}_stmt_${Date.now()}_${i}`,
              clientId,
              t.date, t.amount, t.description, t.category,
              t.merchantName, t.isRecurring ? 1 : 0, t.type
            );
          }
        });
        insertMany(newTxns);

        // Update client balance
        db.prepare("UPDATE clients SET total_balance = ? WHERE id = ?")
          .run(bankData.summary.closingBalance, clientId);

        // Reload full client + transactions for re-analysis
        const cRow = db.prepare("SELECT * FROM clients WHERE id = ?").get(clientId) as Record<string, unknown>;
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
        ).all(clientId) as Record<string, unknown>[];

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

        // Re-run full AI analysis (signal detection + Claude synthesis)
        const newAnalysis = await analyzeClient(client, allTransactions);

        // Upsert analysis
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

        return NextResponse.json({
          bankStatementProcessed: true,
          transactionsAdded: newTxns.length,
          newScore: newAnalysis.score,
          keyObservations: bankData.summary.keyObservations,
        });
      }

      // ── Different person's bank statement: defer with bank data ──
      // Build a client profile from the account holder info.
      // The actual analysis (with transactions) will run in /api/confirm-lead.
      const clientProfile = {
        firstName: bankData.accountHolder.firstName,
        lastName: bankData.accountHolder.lastName,
        occupation: "Unknown",
        city: "Unknown",
        province: "ON",
        estimatedAnnualIncome: 0,
        estimatedAge: 0,
      };
      const placeholderAnalysis = {
        score: 50,
        confidence: "low",
        signals: [] as unknown[],
        summary: bankData.summary.keyObservations,
        detailedReasoning: `Bank statement from ${bankData.accountHolder.institutionName || "financial institution"} covering ${bankData.statementPeriod.startDate} to ${bankData.statementPeriod.endDate}. ${bankData.transactions.length} transactions extracted.`,
        recommendedActions: [{
          priority: 1,
          action: "Review extracted bank statement data",
          rationale: "Transaction data has been extracted and will be analyzed upon lead creation.",
          estimatedImpact: "Enables transaction-based lead scoring",
          requiresHumanApproval: false,
        }],
        humanDecisionRequired: "Review the extracted bank statement data and verify the client information.",
      };

      const duplicates = findPotentialDuplicates(
        clientProfile.firstName,
        clientProfile.lastName,
        {
          city: clientProfile.city,
          province: clientProfile.province,
          occupation: clientProfile.occupation,
          age: clientProfile.estimatedAge,
        },
        clientId
      );

      return NextResponse.json({
        requiresConfirmation: true,
        pendingLead: {
          clientProfile,
          analysis: placeholderAnalysis,
          modelUsed: detection.modelUsed,
          notesText,
          bankData,
        },
        duplicates,
      });
    }

    // ── Different person (meeting notes): check for duplicates before creating ──
    const { clientProfile, analysis } = detection.data;
    const { modelUsed } = detection;

    const duplicates = findPotentialDuplicates(
      clientProfile.firstName,
      clientProfile.lastName,
      {
        city: clientProfile.city,
        province: clientProfile.province,
        occupation: clientProfile.occupation,
        age: clientProfile.estimatedAge,
      },
      clientId // exclude the current client from matches
    );

    return NextResponse.json({
      requiresConfirmation: true,
      pendingLead: { clientProfile, analysis, modelUsed, notesText },
      duplicates,
    });
  } catch (error) {
    console.error("Notes analysis failed:", error);

    let detail = "Unknown error";
    if (error instanceof Error) {
      detail = error.message;
    }

    const isAuthError =
      detail.includes("401") ||
      detail.includes("authentication") ||
      detail.includes("api_key") ||
      detail.includes("invalid x-api-key");

    const userMessage = isAuthError
      ? `API authentication failed — check that ANTHROPIC_API_KEY is valid. (${detail})`
      : `Analysis failed: ${detail}`;

    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
