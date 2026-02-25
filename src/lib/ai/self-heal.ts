/**
 * Self-healing module for AI responses.
 *
 * When a fallback model (e.g. Groq/Llama) returns structurally invalid JSON,
 * this module sends the malformed response to Claude Sonnet for repair.
 * Claude fixes the structure while preserving the data, then the result is
 * re-validated with Zod.
 *
 * This means the user never sees a "bad data" error — the AI fixes itself.
 */

import { anthropic } from "./client";
import type { ZodType } from "zod";

const REPAIR_MODEL = "claude-sonnet-4-20250514";

/**
 * Attempt to repair a malformed JSON response by sending it to Claude
 * with the schema description and validation errors as context.
 *
 * Returns the corrected, Zod-validated object — or throws if repair fails.
 */
export async function selfHeal<T>(
  malformedJson: unknown,
  zodSchema: ZodType<T>,
  schemaDescription: string,
  validationErrors: string
): Promise<T> {
  console.warn(
    `[AI:self-heal] Attempting repair. Errors: ${validationErrors}`
  );

  const repairPrompt = `You received a malformed JSON response from another AI model. Fix it to match the required schema exactly.

REQUIRED SCHEMA:
${schemaDescription}

VALIDATION ERRORS:
${validationErrors}

MALFORMED JSON:
${JSON.stringify(malformedJson, null, 2)}

Return ONLY the corrected JSON object. No explanation, no markdown fences, just valid JSON.`;

  const response = await anthropic.messages.create({
    model: REPAIR_MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: repairPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("[AI:self-heal] Claude returned no text in repair response");
  }

  // Parse Claude's JSON response — strip markdown fences if present
  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const repaired = JSON.parse(jsonText);
  const parseResult = zodSchema.safeParse(repaired);

  if (!parseResult.success) {
    console.error(
      "[AI:self-heal] Repair failed validation:",
      parseResult.error
    );
    throw new Error(
      "[AI:self-heal] Claude repair also produced invalid output"
    );
  }

  console.log("[AI:self-heal] Successfully repaired response");
  return parseResult.data;
}
