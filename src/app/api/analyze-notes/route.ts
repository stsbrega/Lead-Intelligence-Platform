import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/data/db";
import { analyzeNotesWithDetection } from "@/lib/ai/notes-analyzer";
import type { ExistingClientContext } from "@/lib/ai/notes-analyzer";
import { analyzeClient } from "@/lib/ai/engine";
import { extractText, isSupportedFile } from "@/lib/file-parser";
import { findPotentialDuplicates } from "@/lib/data/duplicate-check";
import type { Client, Transaction } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fuzzy name match: handles abbreviations, middle names, and minor variations.
 * Last name must match (exact or one contains the other).
 * First name: exact, prefix (≥3 chars), or one contains the other.
 */
function fuzzyNameMatch(
  holderFirst: string,
  holderLast: string,
  clientFirst: string,
  clientLast: string
): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z ]/g, "");
  const hf = norm(holderFirst);
  const hl = norm(holderLast);
  const cf = norm(clientFirst);
  const cl = norm(clientLast);

  // Last names must be compatible
  if (hl !== cl && !hl.includes(cl) && !cl.includes(hl)) return false;

  // First names: exact, contains, or shared prefix ≥ 3 chars
  if (hf === cf) return true;
  if (hf.includes(cf) || cf.includes(hf)) return true;
  const minLen = Math.min(hf.length, cf.length);
  if (minLen >= 3 && hf.slice(0, minLen) === cf.slice(0, minLen)) return true;

  return false;
}

/** Normalize transaction description for deduplication (lowercase, strip non-alphanumeric, first 30 chars). */
function normalizeDesc(d: string): string {
  return d.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
}

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

    // ── Load existing context so the AI can recognize already-uploaded data ──
    const existingNotes = db.prepare(
      "SELECT summary_addendum FROM advisor_note_analyses WHERE client_id = ? ORDER BY analyzed_at DESC LIMIT 10"
    ).all(clientId) as { summary_addendum: string }[];

    const txnStats = db.prepare(
      "SELECT COUNT(*) as count, MIN(date) as minDate, MAX(date) as maxDate FROM transactions WHERE client_id = ?"
    ).get(clientId) as { count: number; minDate: string | null; maxDate: string | null };

    const existingContext: ExistingClientContext = {
      previousNoteSummaries: existingNotes.map((n) => n.summary_addendum).filter(Boolean),
      existingTransactionPeriod: txnStats?.minDate
        ? { startDate: txnStats.minDate, endDate: txnStats.maxDate! }
        : null,
      existingTransactionCount: txnStats?.count ?? 0,
    };

    console.log(`[analyze-notes] Client: ${clientName}, existing notes: ${existingContext.previousNoteSummaries.length}, existing txns: ${existingContext.existingTransactionCount}`);

    const detection = await analyzeNotesWithDetection(
      clientName,
      analysisRow?.summary ?? null,
      analysisRow?.score ?? null,
      notesText,
      existingContext
    );

    console.log(`[analyze-notes] Detection result: type=${detection.type}, model=${detection.modelUsed}`);

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

      console.log(`[analyze-notes] Bank statement: holder=${bankData.accountHolder.firstName} ${bankData.accountHolder.lastName}, txns=${bankData.transactions.length}`);

      // Determine whether the account holder matches the current client (fuzzy)
      const nameMatches = fuzzyNameMatch(
        bankData.accountHolder.firstName,
        bankData.accountHolder.lastName,
        clientRow.first_name,
        clientRow.last_name
      );

      console.log(`[analyze-notes] Name match: ${nameMatches} (holder: "${bankData.accountHolder.firstName} ${bankData.accountHolder.lastName}" vs client: "${clientRow.first_name} ${clientRow.last_name}")`);

      if (nameMatches) {
        // ── Same person: insert transactions + re-analyze ──

        // Deduplicate against existing transactions (normalized descriptions
        // to handle minor extraction variations between uploads)
        const existingRows = db.prepare(
          "SELECT date, amount, description FROM transactions WHERE client_id = ?"
        ).all(clientId) as { date: string; amount: number; description: string }[];

        const existingKeys = new Set(
          existingRows.map((r) => `${r.date}|${r.amount}|${normalizeDesc(r.description || "")}`)
        );

        const newTxns = bankData.transactions.filter((txn) => {
          const key = `${txn.date}|${txn.amount}|${normalizeDesc(txn.description)}`;
          return !existingKeys.has(key);
        });

        console.log(`[analyze-notes] Transactions: ${bankData.transactions.length} total, ${newTxns.length} new (${bankData.transactions.length - newTxns.length} deduplicated)`);

        // If ALL transactions are already on file, return early with a clear message
        if (newTxns.length === 0) {
          return NextResponse.json({
            bankStatementProcessed: true,
            transactionsAdded: 0,
            newScore: analysisRow?.score ?? 50,
            keyObservations: "This bank statement appears to have been previously uploaded — all transactions are already on file.",
            alreadyOnFile: true,
          });
        }

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

        console.log(`[analyze-notes] Inserted ${newTxns.length} transactions, updated balance to ${bankData.summary.closingBalance}`);

        // Re-run full AI analysis — wrapped in try-catch so transaction insert
        // is never lost even if re-analysis fails (transactions are already in DB)
        let responseScore = analysisRow?.score ?? 50;
        try {
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

          responseScore = newAnalysis.score;
          console.log(`[analyze-notes] Re-analysis complete, new score: ${newAnalysis.score}`);
        } catch (reanalysisErr) {
          // Transactions are already in the DB — don't let a failed re-analysis
          // cause the entire request to return 500. The page refresh will still
          // show the new transactions, and the analysis can be re-run later.
          console.error("[analyze-notes] Re-analysis failed (transactions saved):", reanalysisErr);
        }

        return NextResponse.json({
          bankStatementProcessed: true,
          transactionsAdded: newTxns.length,
          newScore: responseScore,
          keyObservations: bankData.summary.keyObservations,
        });
      }

      // ── Different person's bank statement: defer with bank data ──
      console.log(`[analyze-notes] Bank statement is for a different person, deferring to confirm-lead`);

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
