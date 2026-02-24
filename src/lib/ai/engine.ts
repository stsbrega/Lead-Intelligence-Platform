import Anthropic from "@anthropic-ai/sdk";
import type { Client, Transaction, AIAnalysis, LeadSignal } from "@/types";
import { detectSignals } from "./signals";
import { SYSTEM_PROMPT, buildUserPrompt, ANALYSIS_TOOL_SCHEMA } from "./prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeClient(
  client: Client,
  transactions: Transaction[]
): Promise<AIAnalysis> {
  // Layer 1: Rule-based signal detection
  const preSignals = detectSignals(transactions, client.totalBalance, client.annualIncome);

  // Layer 2: LLM synthesis via Claude tool use
  const userPrompt = buildUserPrompt(client, transactions, preSignals);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [ANALYSIS_TOOL_SCHEMA],
    tool_choice: { type: "tool", name: "submit_lead_analysis" },
    messages: [{ role: "user", content: userPrompt }],
  });

  // Extract tool use result
  const toolUse = response.content.find(block => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("No tool use response from Claude");
  }

  const analysis = toolUse.input as {
    score: number;
    confidence: "high" | "medium" | "low";
    signals: { type: string; description: string; severity: "high" | "medium" | "low"; estimatedValue: number }[];
    summary: string;
    detailedReasoning: string;
    recommendedActions: { priority: number; action: string; rationale: string; estimatedImpact: string; requiresHumanApproval: boolean }[];
    humanDecisionRequired: string;
  };

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
    modelUsed: "claude-sonnet-4-20250514",
  };
}
