import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/data/db";
import { createLeadFromNotes } from "@/lib/ai/lead-from-notes";
import { extractText, isSupportedFile } from "@/lib/file-parser";

export async function POST(request: NextRequest) {
  let notesText: string;

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    // ── File upload path (Excel, PDF, or text-based files) ──
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
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
    // ── Legacy JSON path (plain text from .txt/.docx read client-side) ──
    const body = await request.json();
    notesText = body.notesText;
  }

  if (!notesText || !notesText.trim()) {
    return NextResponse.json(
      { error: "File appears to be empty or contains no readable text" },
      { status: 400 }
    );
  }

  try {
    const result = await createLeadFromNotes(notesText);

    const clientId = `c_notes_${Date.now()}`;
    const now = new Date().toISOString();
    const analysisId = `analysis_${clientId}`;
    const { clientProfile, analysis } = result;

    // Insert client record
    db.prepare(`
      INSERT INTO clients (id, first_name, last_name, email, age, city, province, occupation, annual_income, account_open_date, total_balance, direct_deposit_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      clientId,
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
      0
    );

    // Insert analysis record
    db.prepare(`
      INSERT INTO analyses (id, client_id, score, confidence, signals, summary, detailed_reasoning, recommended_actions, human_decision_required, analyzed_at, model_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      analysisId,
      clientId,
      analysis.score,
      analysis.confidence,
      JSON.stringify(analysis.signals),
      analysis.summary,
      analysis.detailedReasoning,
      JSON.stringify(analysis.recommendedActions),
      analysis.humanDecisionRequired,
      now,
      "claude-sonnet-4-20250514"
    );

    // Initialize lead status
    db.prepare(`
      INSERT INTO lead_status (client_id, status, advisor_notes, last_updated)
      VALUES (?, ?, ?, ?)
    `).run(clientId, "new", "", now);

    return NextResponse.json({
      clientId,
      clientName: `${clientProfile.firstName} ${clientProfile.lastName}`,
      score: analysis.score,
    });
  } catch (error) {
    console.error("Lead creation from notes failed:", error);
    return NextResponse.json(
      { error: "Failed to create lead from notes. Check API key configuration." },
      { status: 500 }
    );
  }
}
