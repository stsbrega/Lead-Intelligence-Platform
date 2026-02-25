import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/data/db";
import { analyzeNotes } from "@/lib/ai/notes-analyzer";
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
      : `Notes analysis failed: ${detail}`;

    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
