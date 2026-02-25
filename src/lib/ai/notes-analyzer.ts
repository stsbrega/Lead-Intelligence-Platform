import { createMessageWithFallbackAndValidation } from "./client";
import type { NoteAnalysis } from "@/types";
import { NotesAnalysisSchema, type NotesAnalysisResult } from "./schemas";

const NOTES_SYSTEM_PROMPT = `You are an AI assistant for Wealthsimple's financial advisory team. You are analyzing meeting notes written by an advisor after a client conversation.

YOUR TASK:
- Extract key insights from the advisor's notes that supplement the existing transaction-based analysis
- Identify NEW signals not captured by transaction data (e.g., client intent, life changes mentioned verbally, competitor dissatisfaction)
- Suggest updated recommendations based on the new information
- Provide a brief addendum summarizing what the notes reveal
- Suggest a score adjustment (-20 to +20) based on whether the notes strengthen or weaken the lead

CONSTRAINTS:
- Do NOT recommend specific financial products
- Do NOT make suitability determinations
- Focus on factual observations from the notes
- Be concise and actionable`;

const NOTES_TOOL_SCHEMA = {
  name: "submit_notes_analysis",
  description: "Submit the structured analysis of advisor meeting notes",
  input_schema: {
    type: "object" as const,
    required: ["insights", "newSignals", "updatedRecommendations", "summaryAddendum", "scoreAdjustment"],
    properties: {
      insights: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "Key insights extracted from the meeting notes (3-6 bullet points)",
      },
      newSignals: {
        type: "array" as const,
        items: {
          type: "object" as const,
          required: ["type", "description", "severity"],
          properties: {
            type: { type: "string" as const, description: "Signal category" },
            description: { type: "string" as const },
            severity: { type: "string" as const, enum: ["high", "medium", "low"] },
          },
        },
        description: "New opportunity signals discovered from the notes that transaction data alone wouldn't reveal",
      },
      updatedRecommendations: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "Updated or new action recommendations based on the notes",
      },
      summaryAddendum: {
        type: "string" as const,
        description: "2-3 sentence summary of what the meeting notes add to the existing analysis",
      },
      scoreAdjustment: {
        type: "number" as const,
        description: "Score adjustment from -20 to +20 based on how the notes affect lead quality",
      },
    },
  },
};

export async function analyzeNotes(
  clientName: string,
  existingSummary: string | null,
  existingScore: number | null,
  notesText: string
): Promise<Omit<NoteAnalysis, "id" | "clientId" | "notesText" | "analyzedAt">> {
  const userPrompt = `CLIENT: ${clientName}
${existingSummary ? `\nEXISTING AI ANALYSIS SUMMARY:\n${existingSummary}` : "No existing analysis available."}
${existingScore !== null ? `\nCURRENT SCORE: ${existingScore}/100` : ""}

ADVISOR MEETING NOTES:
${notesText}

Analyze these meeting notes and extract insights that supplement the transaction-based analysis.`;

  const { data: result } =
    await createMessageWithFallbackAndValidation<NotesAnalysisResult>({
      anthropicParams: {
        max_tokens: 1500,
        system: NOTES_SYSTEM_PROMPT,
        tools: [NOTES_TOOL_SCHEMA],
        tool_choice: { type: "tool", name: "submit_notes_analysis" },
        messages: [{ role: "user", content: userPrompt }],
      },
      groqParams: {
        system: NOTES_SYSTEM_PROMPT,
        userMessage: userPrompt,
        tool: NOTES_TOOL_SCHEMA,
        maxTokens: 1500,
      },
      zodSchema: NotesAnalysisSchema,
      schemaDescription:
        "Object with: insights (array of strings), newSignals (array of {type, description, severity: high|medium|low}), updatedRecommendations (array of strings), summaryAddendum (string), scoreAdjustment (number -20 to +20)",
      toolName: "submit_notes_analysis",
    });

  // Clamp score adjustment to -20..+20
  result.scoreAdjustment = Math.max(-20, Math.min(20, result.scoreAdjustment));

  return result;
}
