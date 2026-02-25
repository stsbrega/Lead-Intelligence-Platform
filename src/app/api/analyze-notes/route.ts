import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/data/db";
import { analyzeNotesWithDetection } from "@/lib/ai/notes-analyzer";
import { extractText, isSupportedFile } from "@/lib/file-parser";

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

  const analysisRow = db.prepare("SELECT summary, score FROM analyses WHERE client_id = ?").get(clientId) as
    | { summary: string; score: number }
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

      return NextResponse.json({
        noteAnalysis: {
          id,
          clientId,
          notesText,
          ...result,
          analyzedAt,
        },
      });
    }

    // ── Different person: create a new lead ──
    const { clientProfile, analysis } = detection.data;
    const { modelUsed } = detection;
    const newClientId = `c_notes_${Date.now()}`;
    const now = new Date().toISOString();
    const analysisId = `analysis_${newClientId}`;

    db.prepare(`
      INSERT INTO clients (id, first_name, last_name, email, age, city, province, occupation, annual_income, account_open_date, total_balance, direct_deposit_active, lead_source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newClientId,
      clientProfile.firstName,
      clientProfile.lastName,
      "",
      clientProfile.estimatedAge,
      clientProfile.city,
      clientProfile.province,
      clientProfile.occupation,
      clientProfile.estimatedAnnualIncome,
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
      redirect: true,
      clientId: newClientId,
      clientName: `${clientProfile.firstName} ${clientProfile.lastName}`,
      score: analysis.score,
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
