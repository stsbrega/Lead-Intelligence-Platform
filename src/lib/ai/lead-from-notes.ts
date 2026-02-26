import { createMessageWithFallback, createMessageWithFallbackAndValidation } from "./client";
import { LeadFromNotesSchema, BankStatementSchema, type LeadFromNotesResult, type BankStatementResult } from "./schemas";
import { BANK_STATEMENT_TOOL_SCHEMA } from "./notes-analyzer";

const SYSTEM_PROMPT = `You are an AI lead analysis engine for Wealthsimple's financial advisory team. You are analyzing raw advisor meeting notes from a sales call or client conversation.

YOUR TASK:
1. EXTRACT CLIENT PROFILE: Pull out whatever client information you can find in the notes — name, occupation, city, province, estimated income, estimated age. Notes may be messy, contain typos, abbreviations, or incomplete sentences. Do your best to infer.
2. ANALYZE AS A LEAD: Based on the qualitative signals in the notes, score this as a potential lead opportunity. Look for: competitor assets, life events, consolidation intent, dissatisfaction with current providers, large balances, upcoming financial needs.

CONTEXT: Wealthsimple offers chequing accounts, managed investing, self-directed investing (TFSA, RRSP, FHSA, RESP, RRIF, LIRA), and is building lending products. When clients have financial products at competing institutions (TD, RBC, BMO, CIBC, Desjardins, Scotiabank, Manulife, Sun Life, etc.), that represents an opportunity to consolidate.

SCORING GUIDE:
- 80-100: High priority — significant competitor assets, large opportunity, clear signals
- 60-79: Medium priority — meaningful signals, moderate opportunity
- 40-59: Emerging — early-stage signals, monitoring recommended
- 0-39: Low priority — minimal actionable signals

CONSTRAINTS — YOU MUST NOT:
- Recommend specific financial products (suitability requires Know-Your-Client assessment)
- Decide whether to contact the client
- Make assumptions about risk tolerance or goals beyond what the notes explicitly state
- Provide financial advice

For missing client fields, use sensible defaults:
- If no province mentioned, default to "ON"
- If no age mentioned, estimate from context clues or default to 0
- If income not mentioned, estimate from occupation/context or default to 0
- If city not mentioned, default to "Unknown"

CRITICAL JSON FORMATTING: All numeric fields (score, estimatedValue, priority, estimatedAge, estimatedAnnualIncome) MUST be actual JSON numbers (e.g., 85 not "85"). All boolean fields (requiresHumanApproval) MUST be actual JSON booleans (true/false, not "true"/"false").`;

export const NEW_LEAD_TOOL_SCHEMA = {
  name: "submit_lead_from_notes",
  description: "Submit the extracted client profile and lead analysis from meeting notes",
  input_schema: {
    type: "object" as const,
    required: ["clientProfile", "analysis"],
    properties: {
      clientProfile: {
        type: "object" as const,
        required: ["firstName", "lastName", "occupation", "city", "province", "estimatedAnnualIncome", "estimatedAge"],
        properties: {
          firstName: { type: "string" as const, description: "Client's first name extracted from notes" },
          lastName: { type: "string" as const, description: "Client's last name extracted from notes" },
          occupation: { type: "string" as const, description: "Client's occupation or job title" },
          city: { type: "string" as const, description: "Client's city (default 'Unknown' if not mentioned)" },
          province: { type: "string" as const, description: "Client's province abbreviation (default 'ON')" },
          estimatedAnnualIncome: { type: "number" as const, description: "Estimated annual income from notes context (0 if unknown)" },
          estimatedAge: { type: "number" as const, description: "Estimated age from notes context (0 if unknown)" },
        },
      },
      analysis: {
        type: "object" as const,
        required: ["score", "confidence", "signals", "summary", "detailedReasoning", "recommendedActions", "humanDecisionRequired"],
        properties: {
          score: {
            type: "number" as const,
            description: "Lead quality score from 0-100",
          },
          confidence: {
            type: "string" as const,
            enum: ["high", "medium", "low"],
            description: "Confidence level — likely 'medium' or 'low' since analysis is from notes only, not transaction data",
          },
          signals: {
            type: "array" as const,
            items: {
              type: "object" as const,
              required: ["type", "description", "severity", "estimatedValue"],
              properties: {
                type: { type: "string" as const },
                description: { type: "string" as const },
                severity: { type: "string" as const, enum: ["high", "medium", "low"] },
                estimatedValue: { type: "number" as const, description: "Estimated annual value of this signal in dollars" },
              },
            },
          },
          summary: {
            type: "string" as const,
            description: "2-3 sentence plain-English summary for the advisor",
          },
          detailedReasoning: {
            type: "string" as const,
            description: "Detailed analysis referencing specific items from the meeting notes",
          },
          recommendedActions: {
            type: "array" as const,
            items: {
              type: "object" as const,
              required: ["priority", "action", "rationale", "estimatedImpact", "requiresHumanApproval"],
              properties: {
                priority: { type: "number" as const },
                action: { type: "string" as const },
                rationale: { type: "string" as const },
                estimatedImpact: { type: "string" as const },
                requiresHumanApproval: { type: "boolean" as const },
              },
            },
          },
          humanDecisionRequired: {
            type: "string" as const,
            description: "What critical decision the human advisor must make and why",
          },
        },
      },
    },
  },
};

/** Cap document text — raised to 30k for bank statements (tabular, token-efficient). */
const MAX_INPUT_CHARS = 30_000;

function truncateInput(text: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text;
  return (
    text.slice(0, MAX_INPUT_CHARS) +
    "\n\n[... document truncated — remaining content omitted for brevity ...]"
  );
}

export async function createLeadFromNotes(notesText: string): Promise<LeadFromNotesResult & { modelUsed: string }> {
  const trimmed = truncateInput(notesText);

  const userPrompt = `ADVISOR MEETING NOTES (raw):
${trimmed}

Extract the client profile and analyze this as a potential lead opportunity. The notes may be rough, contain typos, or have incomplete information — do your best to interpret them.`;

  const { data: result, modelUsed } =
    await createMessageWithFallbackAndValidation<LeadFromNotesResult>({
      anthropicParams: {
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: [NEW_LEAD_TOOL_SCHEMA],
        tool_choice: { type: "tool", name: "submit_lead_from_notes" },
        messages: [{ role: "user", content: userPrompt }],
      },
      groqParams: {
        system: SYSTEM_PROMPT,
        userMessage: userPrompt,
        tool: NEW_LEAD_TOOL_SCHEMA,
        maxTokens: 4096,
      },
      zodSchema: LeadFromNotesSchema,
      schemaDescription:
        "Object with: clientProfile {firstName, lastName, occupation, city, province, estimatedAnnualIncome (number), estimatedAge (number)} and analysis {score (number 0-100), confidence (high|medium|low), signals (array of {type, description, severity, estimatedValue}), summary (string), detailedReasoning (string), recommendedActions (array of {priority, action, rationale, estimatedImpact, requiresHumanApproval}), humanDecisionRequired (string)}",
      toolName: "submit_lead_from_notes",
    });

  // Clamp score to 0-100
  result.analysis.score = Math.max(0, Math.min(100, result.analysis.score));

  return { ...result, modelUsed };
}

// ── Detection-aware new lead creation ─────────────────────────────────────────

const DETECTION_SYSTEM_PROMPT = `You are an AI lead analysis engine for Wealthsimple's financial advisory team. An advisor has uploaded a document to create a new lead.

STEP 1 — CLASSIFY THE DOCUMENT:

A) BANK STATEMENT — if the document contains:
   - Tabular transaction data (rows with dates, descriptions, amounts)
   - Account summary, opening/closing balance, statement period
   - Financial institution branding (TD, RBC, BMO, CIBC, Scotiabank, etc.)
   → Use submit_bank_statement_data

B) MEETING NOTES / OTHER — any other type of document (advisor notes, call summaries, etc.)
   → Use submit_lead_from_notes

STEP 2 — PROCESS WITH THE CHOSEN TOOL:

IF BANK STATEMENT (submit_bank_statement_data):
- Extract the institution name from the statement header or branding
- Extract the account number exactly as shown (usually partially masked)
- Extract ALL transactions with proper dates (YYYY-MM-DD), amounts (NEGATIVE for withdrawals, POSITIVE for deposits), categories, and types
- Categorize each transaction: use "investment_competitor" for transfers to competing brokerages (RBC Direct Investing, TD Waterhouse, BMO InvestorLine, etc.), "rrsp_contribution"/"tfsa_contribution" for labeled registered accounts, "mortgage_payment" for mortgage/MTG payments, "salary_deposit" for payroll
- Identify recurring transactions (same amount, regular interval)
- Provide closing balance, total inflows/outflows, and key observations

IF MEETING NOTES (submit_lead_from_notes):
- Extract client profile (name, occupation, city, province, estimated income, estimated age)
- Analyze as a lead opportunity and score 0-100
- Look for: competitor assets, life events, consolidation intent, dissatisfaction, large balances

CONSTRAINTS:
- Do NOT recommend specific financial products
- Do NOT make suitability determinations
- Focus on factual observations from the document
- Be concise and actionable

For missing client fields, use sensible defaults:
- Province: default "ON", Age: default 0, Income: default 0, City: default "Unknown"

CRITICAL JSON FORMATTING: All numeric fields MUST be actual JSON numbers (e.g., 85 not "85"). All boolean fields MUST be actual JSON booleans (true/false, not "true"/"false").`;

/**
 * Result types from detection-aware new lead creation.
 * "notes" = standard meeting notes → client profile + analysis.
 * "bank_statement" = bank statement → client profile + analysis + transaction data.
 */
export type NewLeadDetectionResult =
  | { type: "notes"; leadData: LeadFromNotesResult; modelUsed: string }
  | { type: "bank_statement"; leadData: LeadFromNotesResult; bankData: BankStatementResult; modelUsed: string };

/**
 * Create a new lead from an uploaded document, auto-detecting whether it's
 * a bank statement or meeting notes. Bank statements return extracted
 * transaction data alongside the client profile for later insertion.
 */
export async function createLeadFromNotesWithDetection(notesText: string): Promise<NewLeadDetectionResult> {
  const trimmed = truncateInput(notesText);

  const userPrompt = `UPLOADED DOCUMENT:
${trimmed}

Classify this document and process it with the appropriate tool. Extract all available information.`;

  try {
    const response = await createMessageWithFallback({
      max_tokens: 8192,
      system: DETECTION_SYSTEM_PROMPT,
      tools: [NEW_LEAD_TOOL_SCHEMA, BANK_STATEMENT_TOOL_SCHEMA],
      tool_choice: { type: "any" },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("No tool_use block in detection response");
    }

    if (toolUse.name === "submit_lead_from_notes") {
      const parsed = LeadFromNotesSchema.safeParse(toolUse.input);
      const data = (parsed.success ? parsed.data : toolUse.input) as LeadFromNotesResult;
      data.analysis.score = Math.max(0, Math.min(100, data.analysis.score));
      return { type: "notes", leadData: data, modelUsed: response.model };
    }

    if (toolUse.name === "submit_bank_statement_data") {
      const parsed = BankStatementSchema.safeParse(toolUse.input);
      const bankData = (parsed.success ? parsed.data : toolUse.input) as BankStatementResult;

      // Build a client profile from the account holder info.
      // A proper AI analysis will be generated after the transactions are
      // inserted (in /api/confirm-lead), so this is a placeholder.
      const leadData: LeadFromNotesResult = {
        clientProfile: {
          firstName: bankData.accountHolder.firstName,
          lastName: bankData.accountHolder.lastName,
          occupation: "Unknown",
          city: "Unknown",
          province: "ON",
          estimatedAnnualIncome: 0,
          estimatedAge: 0,
        },
        analysis: {
          score: 50,
          confidence: "low" as const,
          signals: [],
          summary: bankData.summary.keyObservations,
          detailedReasoning: `Bank statement from ${bankData.accountHolder.institutionName || "financial institution"} covering ${bankData.statementPeriod.startDate} to ${bankData.statementPeriod.endDate}. ${bankData.transactions.length} transactions extracted. Closing balance: $${bankData.summary.closingBalance.toLocaleString()}.`,
          recommendedActions: [{
            priority: 1,
            action: "Review extracted bank statement data and transaction history",
            rationale: "AI has extracted transaction data from the bank statement. Review for accuracy and completeness.",
            estimatedImpact: "Enables transaction-based lead scoring and signal detection",
            requiresHumanApproval: false,
          }],
          humanDecisionRequired: "Review the extracted bank statement data and verify the client information is accurate.",
        },
      };

      return { type: "bank_statement", leadData, bankData, modelUsed: response.model };
    }

    throw new Error(`Unexpected tool name: ${toolUse.name}`);
  } catch (err) {
    // If detection fails, fall back to standard single-tool pipeline (Groq-compatible)
    console.warn("[AI] New lead detection failed, falling back to single-tool:", err);
    const result = await createLeadFromNotes(notesText);
    return { type: "notes", leadData: result, modelUsed: result.modelUsed };
  }
}
