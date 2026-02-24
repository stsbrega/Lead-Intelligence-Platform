import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/data/db";
import { analyzeNotes } from "@/lib/ai/notes-analyzer";

export async function POST(request: NextRequest) {
  const { clientId, notesText } = await request.json();

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

  const analysisRow = db.prepare("SELECT summary, score FROM analyses WHERE client_id = ?").get(clientId) as
    | { summary: string; score: number }
    | undefined;

  try {
    const result = await analyzeNotes(
      `${clientRow.first_name} ${clientRow.last_name}`,
      analysisRow?.summary ?? null,
      analysisRow?.score ?? null,
      notesText
    );

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

    return NextResponse.json({
      noteAnalysis: {
        id,
        clientId,
        notesText,
        ...result,
        analyzedAt,
      },
    });
  } catch (error) {
    console.error("Notes analysis failed:", error);
    return NextResponse.json(
      { error: "Notes analysis failed. Check API key configuration." },
      { status: 500 }
    );
  }
}
