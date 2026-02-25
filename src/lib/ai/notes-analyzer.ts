import { createMessageWithFallback, createMessageWithFallbackAndValidation } from "./client";
import type { NoteAnalysis } from "@/types";
import { NotesAnalysisSchema, LeadFromNotesSchema, type NotesAnalysisResult, type LeadFromNotesResult } from "./schemas";
import { NEW_LEAD_TOOL_SCHEMA } from "./lead-from-notes";

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

// ── Detection-aware analysis ──────────────────────────────────────────────────

const DETECTION_SYSTEM_PROMPT = `You are an AI assistant for Wealthsimple's financial advisory team.

An advisor has uploaded a document while viewing a specific client's profile. Your FIRST task is to determine whether this document is about the CURRENT CLIENT or about a DIFFERENT PERSON.

RULES FOR DETERMINING RELEVANCE:
- If the document contains a name that matches or closely matches the current client, it is about the current client. Use the submit_notes_analysis tool.
- If the document contains a clearly different person's name (e.g., a bank statement header for "Michael Thornton" when the current client is "Jane Smith"), it is about a different person. Use the submit_new_lead_from_notes tool.
- If the document has no identifiable name but contains account details, transaction data, or notes that could plausibly be about the current client, default to treating it as the current client. Use submit_notes_analysis.
- When in doubt, default to submit_notes_analysis for the current client.

IF THE DOCUMENT IS ABOUT THE CURRENT CLIENT (submit_notes_analysis):
- Extract key insights that supplement the existing analysis
- Identify NEW signals not captured by transaction data
- Suggest updated recommendations
- Provide a brief summary addendum
- Suggest a score adjustment (-20 to +20)

IF THE DOCUMENT IS ABOUT A DIFFERENT PERSON (submit_new_lead_from_notes):
- Extract the new person's client profile (name, occupation, city, province, income, age)
- Analyze them as a potential lead opportunity
- Score them 0-100 based on signals found

CONSTRAINTS:
- Do NOT recommend specific financial products
- Do NOT make suitability determinations
- Focus on factual observations from the document
- Be concise and actionable

CRITICAL JSON FORMATTING: All numeric fields (score, estimatedValue, priority, estimatedAge, estimatedAnnualIncome, scoreAdjustment) MUST be actual JSON numbers (e.g., 85 not "85"). All boolean fields (requiresHumanApproval) MUST be actual JSON booleans (true/false, not "true"/"false").`;

export type DetectionResult =
  | { type: "same_client"; data: NotesAnalysisResult; modelUsed: string }
  | { type: "different_person"; data: LeadFromNotesResult; modelUsed: string };

/**
 * Analyze a document with auto-detection: determines whether the document
 * is about the current client (supplementary analysis) or a different person
 * (new lead creation). Uses a two-tool-choice pattern in a single AI call.
 */
export async function analyzeNotesWithDetection(
  clientName: string,
  existingSummary: string | null,
  existingScore: number | null,
  notesText: string
): Promise<DetectionResult> {
  const userPrompt = `CURRENT CLIENT: ${clientName}
${existingSummary ? `\nEXISTING AI ANALYSIS SUMMARY:\n${existingSummary}` : "\nNo existing analysis available."}
${existingScore !== null ? `CURRENT SCORE: ${existingScore}/100` : ""}

UPLOADED DOCUMENT:
${notesText}

Determine if this document is about the current client (${clientName}) or a different person, then analyze accordingly using the appropriate tool.`;

  try {
    const response = await createMessageWithFallback({
      max_tokens: 2500,
      system: DETECTION_SYSTEM_PROMPT,
      tools: [NOTES_TOOL_SCHEMA, NEW_LEAD_TOOL_SCHEMA],
      tool_choice: { type: "any" },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("No tool_use block in detection response");
    }

    if (toolUse.name === "submit_notes_analysis") {
      const parsed = NotesAnalysisSchema.safeParse(toolUse.input);
      const data = (parsed.success ? parsed.data : toolUse.input) as NotesAnalysisResult;
      data.scoreAdjustment = Math.max(-20, Math.min(20, data.scoreAdjustment));
      return { type: "same_client", data, modelUsed: response.model };
    }

    if (toolUse.name === "submit_lead_from_notes") {
      const parsed = LeadFromNotesSchema.safeParse(toolUse.input);
      const data = (parsed.success ? parsed.data : toolUse.input) as LeadFromNotesResult;
      data.analysis.score = Math.max(0, Math.min(100, data.analysis.score));
      return { type: "different_person", data, modelUsed: response.model };
    }

    throw new Error(`Unexpected tool name: ${toolUse.name}`);
  } catch (err) {
    // If detection fails (all Claude models down), fall back to same-client
    // analysis via the standard validated pipeline with Groq support.
    console.warn("[AI] Detection call failed, falling back to same-client analysis:", err);
    const { data: result, modelUsed } =
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
    result.scoreAdjustment = Math.max(-20, Math.min(20, result.scoreAdjustment));
    return { type: "same_client", data: result, modelUsed };
  }
}
