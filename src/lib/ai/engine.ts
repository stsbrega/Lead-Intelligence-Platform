import { createMessageWithFallbackAndValidation } from "./client";
import type { Client, Transaction, AIAnalysis, LeadSignal } from "@/types";
import { detectSignals } from "./signals";
import { SYSTEM_PROMPT, buildUserPrompt, ANALYSIS_TOOL_SCHEMA } from "./prompts";
import { LeadAnalysisSchema, type LeadAnalysisResult } from "./schemas";

export async function analyzeClient(
  client: Client,
  transactions: Transaction[]
): Promise<AIAnalysis> {
  // Layer 1: Rule-based signal detection
  const preSignals = detectSignals(transactions, client.totalBalance, client.annualIncome);

  // Layer 2: LLM synthesis via Claude tool use
  const userPrompt = buildUserPrompt(client, transactions, preSignals);

  const { data: analysis, modelUsed } =
    await createMessageWithFallbackAndValidation<LeadAnalysisResult>({
      anthropicParams: {
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: [ANALYSIS_TOOL_SCHEMA],
        tool_choice: { type: "tool", name: "submit_lead_analysis" },
        messages: [{ role: "user", content: userPrompt }],
      },
      groqParams: {
        system: SYSTEM_PROMPT,
        userMessage: userPrompt,
        tool: ANALYSIS_TOOL_SCHEMA,
        maxTokens: 2048,
      },
      zodSchema: LeadAnalysisSchema,
      schemaDescription:
        "Object with: score (number 0-100), confidence (high|medium|low), signals (array of {type, description, severity, estimatedValue}), summary (string), detailedReasoning (string), recommendedActions (array of {priority, action, rationale, estimatedImpact, requiresHumanApproval}), humanDecisionRequired (string)",
      toolName: "submit_lead_analysis",
    });

  return {
    id: `analysis_${client.id}`,
    clientId: client.id,
    score: analysis.score,
    confidence: analysis.confidence,
    signals: analysis.signals.map((s, i) => ({
      ...s,
      type: s.type as LeadSignal["type"],
      relatedTransactionIds: preSignals[i]?.relatedTransactionIds || [],
    })),
    summary: analysis.summary,
    detailedReasoning: analysis.detailedReasoning,
    recommendedActions: analysis.recommendedActions,
    humanDecisionRequired: analysis.humanDecisionRequired,
    analyzedAt: new Date().toISOString(),
    modelUsed,
  };
}
