import type { Client, Transaction, LeadSignal } from "@/types";
import { formatCurrency } from "@/lib/utils/formatting";

export const SYSTEM_PROMPT = `You are an AI lead analysis engine for Wealthsimple's financial advisory team. Your role is to analyze client bank transaction data and identify opportunities where a financial advisor could help improve the client's financial outcomes.

CONTEXT: Wealthsimple offers chequing accounts, managed investing, self-directed investing (TFSA, RRSP, FHSA, RESP, RRIF, LIRA), and is building lending products. When clients have financial products at competing institutions (TD, RBC, BMO, CIBC, Desjardins, Scotiabank, Manulife, Sun Life, etc.), that represents an opportunity to consolidate.

YOUR RESPONSIBILITIES:
- Analyze pre-detected transaction signals and the full transaction context
- Score lead quality (0-100) based on opportunity size, conversion likelihood, and urgency
- Provide clear, evidence-based reasoning an advisor can review
- Suggest specific follow-up actions with rationale
- Explicitly state what decision the human advisor must make

CONSTRAINTS — YOU MUST NOT:
- Recommend specific financial products (suitability requires Know-Your-Client assessment)
- Decide whether to contact the client
- Make assumptions about risk tolerance, goals, or personal circumstances
- Provide financial advice

SCORING GUIDE:
- 80-100: High priority — significant competitor assets, large opportunity, clear signals
- 60-79: Medium priority — meaningful signals, moderate opportunity
- 40-59: Emerging — early-stage signals, monitoring recommended
- 0-39: Low priority — minimal actionable signals

Always reference specific transactions and dollar amounts in your reasoning.

CRITICAL JSON FORMATTING: All numeric fields (score, estimatedValue, priority) MUST be actual JSON numbers (e.g., 85 not "85"). All boolean fields (requiresHumanApproval) MUST be actual JSON booleans (true/false, not "true"/"false").`;

export function buildUserPrompt(
  client: Client,
  transactions: Transaction[],
  preDetectedSignals: LeadSignal[]
): string {
  const signalSummary = preDetectedSignals.map(s =>
    `- [${s.severity.toUpperCase()}] ${s.type}: ${s.description} (est. value: ${formatCurrency(s.estimatedValue)})`
  ).join("\n");

  const recentTxns = transactions
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 40)
    .map(t => `${t.date} | ${t.amount > 0 ? "+" : ""}${formatCurrency(t.amount)} | ${t.description} | ${t.category}`)
    .join("\n");

  return `CLIENT PROFILE:
Name: ${client.firstName} ${client.lastName}
Age: ${client.age}
City: ${client.city}, ${client.province}
Occupation: ${client.occupation}
Annual Income: ${formatCurrency(client.annualIncome)}
Account Balance: ${formatCurrency(client.totalBalance)}
Direct Deposit: ${client.directDepositActive ? "Yes" : "No"}
Client Since: ${client.accountOpenDate}

PRE-DETECTED SIGNALS:
${signalSummary || "No signals pre-detected"}

RECENT TRANSACTIONS (most recent first):
${recentTxns}

Analyze this client as a potential lead. Provide your structured assessment.`;
}

export const ANALYSIS_TOOL_SCHEMA = {
  name: "submit_lead_analysis",
  description: "Submit the structured lead analysis for this client",
  input_schema: {
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
        description: "Confidence level in the analysis",
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
            estimatedValue: { type: "number" as const },
          },
        },
      },
      summary: {
        type: "string" as const,
        description: "2-3 sentence plain-English summary for the advisor",
      },
      detailedReasoning: {
        type: "string" as const,
        description: "Detailed analysis with specific transaction references and dollar amounts",
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
};
