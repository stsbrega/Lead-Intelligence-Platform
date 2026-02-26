import { createMessageWithFallback, createMessageWithFallbackAndValidation } from "./client";
import type { NoteAnalysis } from "@/types";
import { NotesAnalysisSchema, LeadFromNotesSchema, BankStatementSchema, type NotesAnalysisResult, type LeadFromNotesResult, type BankStatementResult } from "./schemas";
import { NEW_LEAD_TOOL_SCHEMA } from "./lead-from-notes";

/** Cap document text — raised to 30k for bank statements (tabular, token-efficient). */
const MAX_INPUT_CHARS = 30_000;
function truncateInput(text: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text;
  return (
    text.slice(0, MAX_INPUT_CHARS) +
    "\n\n[... document truncated — remaining content omitted for brevity ...]"
  );
}

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

export const BANK_STATEMENT_TOOL_SCHEMA = {
  name: "submit_bank_statement_data",
  description:
    "Submit structured data extracted from a bank or financial institution statement. Use this when the uploaded document contains tabular transaction data with dates, descriptions, and amounts.",
  input_schema: {
    type: "object" as const,
    required: ["accountHolder", "statementPeriod", "transactions", "summary"],
    properties: {
      accountHolder: {
        type: "object" as const,
        required: ["firstName", "lastName", "institutionName", "accountNumber"],
        properties: {
          firstName: { type: "string" as const },
          lastName: { type: "string" as const },
          institutionName: {
            type: "string" as const,
            description: "Name of the financial institution (e.g., 'TD Canada Trust', 'RBC Royal Bank', 'BMO'). Extract from statement header/branding. Use 'Unknown' if not identifiable.",
          },
          accountNumber: {
            type: "string" as const,
            description: "Account number as shown on statement, typically partially masked (e.g., '****-****-8842'). Include only what is visible. Use empty string if not found.",
          },
        },
      },
      statementPeriod: {
        type: "object" as const,
        required: ["startDate", "endDate"],
        properties: {
          startDate: { type: "string" as const, description: "YYYY-MM-DD" },
          endDate: { type: "string" as const, description: "YYYY-MM-DD" },
        },
      },
      transactions: {
        type: "array" as const,
        description: "All transactions from the statement.",
        items: {
          type: "object" as const,
          required: ["date", "description", "amount", "category", "merchantName", "type", "isRecurring"],
          properties: {
            date: { type: "string" as const, description: "YYYY-MM-DD" },
            description: { type: "string" as const, description: "Transaction description as shown on statement" },
            amount: { type: "number" as const, description: "NEGATIVE for withdrawals/debits, POSITIVE for deposits/credits" },
            category: {
              type: "string" as const,
              enum: [
                "investment_competitor", "rrsp_contribution", "tfsa_contribution",
                "mortgage_payment", "insurance_premium", "salary_deposit",
                "government_deposit", "large_transfer", "loan_payment",
                "subscription", "groceries", "dining", "transportation",
                "utilities", "rent", "healthcare", "entertainment", "shopping", "other",
              ],
              description: "Use investment_competitor for transfers to competing brokerages (RBC, TD, BMO, etc). Use rrsp_contribution/tfsa_contribution for labeled registered account transfers.",
            },
            merchantName: { type: "string" as const },
            type: {
              type: "string" as const,
              enum: ["debit", "credit", "pad", "eft", "e-transfer", "direct-deposit"],
              description: "pad = pre-authorized debit, eft = electronic funds transfer, direct-deposit = payroll",
            },
            isRecurring: { type: "boolean" as const, description: "True if recurring (same amount, regular interval)" },
          },
        },
      },
      summary: {
        type: "object" as const,
        required: ["closingBalance", "totalInflows", "totalOutflows", "keyObservations"],
        properties: {
          closingBalance: { type: "number" as const },
          totalInflows: { type: "number" as const, description: "Total deposits/credits" },
          totalOutflows: { type: "number" as const, description: "Total withdrawals/debits (as positive number)" },
          keyObservations: { type: "string" as const, description: "2-3 sentences: notable patterns, competitor transfers, large deposits" },
        },
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
  const trimmed = truncateInput(notesText);
  const userPrompt = `CLIENT: ${clientName}
${existingSummary ? `\nEXISTING AI ANALYSIS SUMMARY:\n${existingSummary}` : "No existing analysis available."}
${existingScore !== null ? `\nCURRENT SCORE: ${existingScore}/100` : ""}

ADVISOR MEETING NOTES:
${trimmed}

Analyze these meeting notes and extract insights that supplement the transaction-based analysis.`;

  const { data: result } =
    await createMessageWithFallbackAndValidation<NotesAnalysisResult>({
      anthropicParams: {
        max_tokens: 2500,
        system: NOTES_SYSTEM_PROMPT,
        tools: [NOTES_TOOL_SCHEMA],
        tool_choice: { type: "tool", name: "submit_notes_analysis" },
        messages: [{ role: "user", content: userPrompt }],
      },
      groqParams: {
        system: NOTES_SYSTEM_PROMPT,
        userMessage: userPrompt,
        tool: NOTES_TOOL_SCHEMA,
        maxTokens: 2500,
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

An advisor has uploaded a document while viewing a specific client's profile. Your FIRST task is to CLASSIFY the document, then process it with the correct tool.

STEP 1 — CLASSIFY THE DOCUMENT:

A) BANK STATEMENT — if the document contains:
   - Tabular transaction data (rows with dates, descriptions, amounts)
   - Account summary, opening/closing balance, statement period
   - Financial institution branding (TD, RBC, BMO, CIBC, Scotiabank, etc.)
   → ALWAYS use submit_bank_statement_data to extract the full transaction data.
     Do this regardless of whether the account holder name matches the current client.
     The system will handle name matching separately.

B) MEETING NOTES about the current client — if the document is narrative text with:
   - Advisor observations, client conversation notes, call summaries
   - Qualitative information about goals, concerns, life events
   - The document is clearly about the SAME person as the current client
   → Use submit_notes_analysis

C) MEETING NOTES about a DIFFERENT PERSON — if the document is narrative text
   (NOT a bank statement) about a clearly different person than the current client
   → Use submit_lead_from_notes

When in doubt between notes analysis and lead creation, default to submit_notes_analysis.
When in doubt whether a document is a bank statement, check for tabular transaction rows — if present, use submit_bank_statement_data.

STEP 2 — PROCESS WITH THE CHOSEN TOOL:

IF BANK STATEMENT (submit_bank_statement_data):
- Extract the institution name from the statement header or branding (e.g., "TD Canada Trust", "RBC Royal Bank")
- Extract the account number exactly as shown on the statement (usually partially masked, e.g., "****-****-8842")
- Extract ALL transactions with proper dates (YYYY-MM-DD), amounts (NEGATIVE for withdrawals, POSITIVE for deposits), categories, and types
- Categorize each transaction: use "investment_competitor" for transfers to competing brokerages (RBC Direct Investing, TD Waterhouse, BMO InvestorLine, etc.), "rrsp_contribution"/"tfsa_contribution" for labeled registered accounts, "mortgage_payment" for mortgage/MTG payments, "salary_deposit" for payroll
- Identify recurring transactions (same amount, regular interval)
- Provide closing balance, total inflows/outflows, and key observations

IF MEETING NOTES (submit_notes_analysis):
- Extract key insights that supplement the existing analysis
- Identify NEW signals not captured by transaction data
- Suggest updated recommendations and a score adjustment (-20 to +20)

IF DIFFERENT PERSON (submit_lead_from_notes):
- Extract the person's profile and analyze as a potential lead (score 0-100)

CONSTRAINTS:
- Do NOT recommend specific financial products
- Do NOT make suitability determinations
- Focus on factual observations from the document
- Be concise and actionable

CRITICAL JSON FORMATTING: All numeric fields MUST be actual JSON numbers (e.g., 85 not "85"). All boolean fields MUST be actual JSON booleans (true/false, not "true"/"false").`;

export type DetectionResult =
  | { type: "same_client"; data: NotesAnalysisResult; modelUsed: string }
  | { type: "bank_statement"; data: BankStatementResult; modelUsed: string }
  | { type: "different_person"; data: LeadFromNotesResult; modelUsed: string };

/**
 * Analyze a document with auto-detection: classifies the document as a bank
 * statement, meeting notes (same client), or different person, then extracts
 * the appropriate structured data. Uses a three-tool-choice pattern.
 */
export async function analyzeNotesWithDetection(
  clientName: string,
  existingSummary: string | null,
  existingScore: number | null,
  notesText: string
): Promise<DetectionResult> {
  const trimmed = truncateInput(notesText);
  const userPrompt = `CURRENT CLIENT: ${clientName}
${existingSummary ? `\nEXISTING AI ANALYSIS SUMMARY:\n${existingSummary}` : "\nNo existing analysis available."}
${existingScore !== null ? `CURRENT SCORE: ${existingScore}/100` : ""}

UPLOADED DOCUMENT:
${trimmed}

Classify this document (bank statement, meeting notes, or different person) and process it with the appropriate tool. The current client is ${clientName}.`;

  try {
    const response = await createMessageWithFallback({
      max_tokens: 8192,
      system: DETECTION_SYSTEM_PROMPT,
      tools: [NOTES_TOOL_SCHEMA, BANK_STATEMENT_TOOL_SCHEMA, NEW_LEAD_TOOL_SCHEMA],
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

    if (toolUse.name === "submit_bank_statement_data") {
      const parsed = BankStatementSchema.safeParse(toolUse.input);
      const data = (parsed.success ? parsed.data : toolUse.input) as BankStatementResult;
      return { type: "bank_statement", data, modelUsed: response.model };
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
          max_tokens: 2500,
          system: NOTES_SYSTEM_PROMPT,
          tools: [NOTES_TOOL_SCHEMA],
          tool_choice: { type: "tool", name: "submit_notes_analysis" },
          messages: [{ role: "user", content: userPrompt }],
        },
        groqParams: {
          system: NOTES_SYSTEM_PROMPT,
          userMessage: userPrompt,
          tool: NOTES_TOOL_SCHEMA,
          maxTokens: 2500,
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
