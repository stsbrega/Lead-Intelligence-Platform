import { NextResponse } from "next/server";
import { createMessageWithFallbackAndValidation } from "@/lib/ai/client";
import { CompetitorComparisonSchema, type CompetitorComparisonResult } from "@/lib/ai/schemas";

const COMPARISON_TOOL_SCHEMA = {
  name: "submit_competitor_comparison",
  description: "Submit the structured competitor comparison analysis",
  input_schema: {
    type: "object" as const,
    required: ["competitorName", "competitorPros", "competitorCons", "wealthsimplePros", "wealthsimpleCons", "valueStatement", "keyDifferentiators", "switchingConsiderations"],
    properties: {
      competitorName: {
        type: "string" as const,
        description: "The competitor institution being compared",
      },
      competitorPros: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "Key advantages of staying with the competitor",
      },
      competitorCons: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "Key disadvantages or limitations of the competitor",
      },
      wealthsimplePros: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "Key advantages Wealthsimple offers over this competitor",
      },
      wealthsimpleCons: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "Areas where Wealthsimple may not yet match the competitor",
      },
      valueStatement: {
        type: "string" as const,
        description: "A persuasive 2-4 sentence value statement an advisor can use when speaking with this client about consolidating to Wealthsimple. Should reference the specific dollar amounts and products involved.",
      },
      keyDifferentiators: {
        type: "array" as const,
        items: {
          type: "object" as const,
          required: ["area", "competitor", "wealthsimple", "advantage"],
          properties: {
            area: { type: "string" as const, description: "Comparison area (e.g., Fees, Platform, Service)" },
            competitor: { type: "string" as const, description: "What the competitor offers in this area" },
            wealthsimple: { type: "string" as const, description: "What Wealthsimple offers in this area" },
            advantage: { type: "string" as const, enum: ["wealthsimple", "competitor", "neutral"] },
          },
        },
      },
      switchingConsiderations: {
        type: "string" as const,
        description: "Brief note on what the advisor should be aware of regarding account transfer logistics, timing, or potential fees",
      },
    },
  },
};

const COMPARISON_SYSTEM_PROMPT = `You are a competitive intelligence assistant for Wealthsimple's financial advisory team. Your role is to provide objective, accurate comparisons between Wealthsimple and competitor financial institutions in Canada to help advisors have informed conversations with prospective clients.

WEALTHSIMPLE'S OFFERINGS:
- Chequing/Savings: No monthly fees, competitive interest on savings, unlimited transactions
- Managed Investing: Automated portfolio management, low MER (0.4-0.5% management fee + ~0.2% ETF fees), socially responsible options, automatic rebalancing
- Self-Directed Trading: Commission-free stock/ETF trading in Canada & US, fractional shares
- Registered Accounts: TFSA, RRSP, FHSA, RESP, RRIF, LIRA — all available with managed or self-directed
- Tax Optimization: Automatic tax-loss harvesting (managed portfolios), overflow optimization
- Platform: Excellent mobile app, clean modern interface, fully digital onboarding
- Crypto: Ability to hold and trade cryptocurrency
- Wealthsimple Cash: High-interest savings, instant P2P transfers

IMPORTANT GUIDELINES:
- Be factual and fair — acknowledge competitor strengths honestly
- Focus on aspects relevant to the specific product types the client uses at the competitor
- The value statement should be conversational, not salesy — it should help an advisor start a genuine conversation
- Reference the client's specific dollar amounts to make the value proposition concrete
- Note any transfer-in bonuses or promotions Wealthsimple may offer (advisor can verify current offers)
- Always mention that suitability assessment is required before any specific product recommendations`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { competitorName, signalDescription, estimatedValue, clientContext } = body;

    if (!competitorName) {
      return NextResponse.json({ error: "competitorName is required" }, { status: 400 });
    }

    const userPrompt = `Compare ${competitorName} versus Wealthsimple for an advisor conversation.

CLIENT CONTEXT:
${clientContext ? `- Annual Income: ${clientContext.annualIncome}
- Total Balance: ${clientContext.totalBalance}
- Age: ${clientContext.age}
- Province: ${clientContext.province}` : "No specific client context available"}

DETECTED SIGNAL:
${signalDescription || "General competitor relationship"}

ESTIMATED ANNUAL VALUE AT COMPETITOR: ${estimatedValue ? `$${estimatedValue.toLocaleString()}` : "Unknown"}

Provide a thorough comparison focusing on the product types this client appears to use at ${competitorName}. The value statement should be specific to this client's situation and dollar amounts.`;

    const { data } =
      await createMessageWithFallbackAndValidation<CompetitorComparisonResult>({
        anthropicParams: {
          max_tokens: 2048,
          system: COMPARISON_SYSTEM_PROMPT,
          tools: [COMPARISON_TOOL_SCHEMA],
          tool_choice: { type: "tool", name: "submit_competitor_comparison" },
          messages: [{ role: "user", content: userPrompt }],
        },
        groqParams: {
          system: COMPARISON_SYSTEM_PROMPT,
          userMessage: userPrompt,
          tool: COMPARISON_TOOL_SCHEMA,
          maxTokens: 2048,
        },
        zodSchema: CompetitorComparisonSchema,
        schemaDescription:
          "Object with: competitorName (string), competitorPros (array of strings), competitorCons (array of strings), wealthsimplePros (array of strings), wealthsimpleCons (array of strings), valueStatement (string), keyDifferentiators (array of {area, competitor, wealthsimple, advantage: wealthsimple|competitor|neutral}), switchingConsiderations (string)",
        toolName: "submit_competitor_comparison",
      });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Competitor comparison error:", error);

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
      : `Comparison failed: ${detail}`;

    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
