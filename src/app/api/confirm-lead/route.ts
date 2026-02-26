import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/data/db";
import { analyzeNotes } from "@/lib/ai/notes-analyzer";
import { findPotentialDuplicates, titleCase } from "@/lib/data/duplicate-check";

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

    const { clientProfile, analysis, modelUsed, notesText } = pendingLead;

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

      // ── Run same-client notes analysis on the existing client ─────────
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
