import { NextRequest, NextResponse } from "next/server";
import { createLeadFromNotesWithDetection } from "@/lib/ai/lead-from-notes";
import { extractText, isSupportedFile } from "@/lib/file-parser";
import { findPotentialDuplicates } from "@/lib/data/duplicate-check";

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
    const result = await createLeadFromNotesWithDetection(notesText);
    const { leadData, modelUsed } = result;
    const { clientProfile, analysis } = leadData;

    // Check for duplicates before creating
    const duplicates = findPotentialDuplicates(
      clientProfile.firstName,
      clientProfile.lastName,
      {
        city: clientProfile.city,
        province: clientProfile.province,
        occupation: clientProfile.occupation,
        age: clientProfile.estimatedAge,
      }
    );

    // Include bank statement data in the pending lead when detected,
    // so /api/confirm-lead can insert the transactions after confirmation.
    const pendingLead: Record<string, unknown> = {
      clientProfile, analysis, modelUsed, notesText,
    };
    if (result.type === "bank_statement") {
      pendingLead.bankData = result.bankData;
    }

    return NextResponse.json({
      requiresConfirmation: true,
      pendingLead,
      duplicates,
    });
  } catch (error) {
    console.error("Lead creation from notes failed:", error);

    let detail = "Unknown error";
    if (error instanceof Error) {
      detail = error.message;
    }

    // Surface specific hints for common Anthropic SDK errors
    const isAuthError =
      detail.includes("401") ||
      detail.includes("authentication") ||
      detail.includes("api_key") ||
      detail.includes("invalid x-api-key");

    const userMessage = isAuthError
      ? `API authentication failed — check that ANTHROPIC_API_KEY is valid. (${detail})`
      : `Lead creation failed: ${detail}`;

    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
