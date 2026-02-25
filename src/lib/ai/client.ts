/**
 * Shared Anthropic client with automatic retry, model fallback, and
 * Groq last-resort fallback with self-healing validation.
 *
 * Full resilience chain:
 *   1. claude-sonnet-4-20250514   (primary — best quality)
 *   2. claude-haiku-4-5-20251001  (fallback — fast, high availability)
 *   3. groq/llama-3.3-70b         (last resort — open-source, high availability)
 *      └─ self-heal via Claude if Groq returns invalid data
 *
 * Transient errors (429 rate-limit, 529 overloaded, 500 server error)
 * trigger a retry on the same model once, then move to the next model.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import type { ZodType } from "zod";
import { callGroq, type GroqCallParams } from "./groq-client";
import { selfHeal } from "./self-heal";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL_CHAIN = [
  "claude-sonnet-4-20250514",
  "claude-haiku-4-5-20251001",
] as const;

const TRANSIENT_STATUS_CODES = new Set([429, 500, 529]);
const RETRY_DELAY_MS = 2000;

function isTransientError(err: unknown): boolean {
  if (err && typeof err === "object" && "status" in err) {
    return TRANSIENT_STATUS_CODES.has((err as { status: number }).status);
  }
  return false;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send a message with automatic model fallback on transient failures.
 * (Preserved for backward compat — consumers that don't need Groq fallback.)
 */
export async function createMessageWithFallback(
  params: Omit<MessageCreateParamsNonStreaming, "model"> & { model?: string }
): Promise<Anthropic.Message> {
  const models = params.model ? [params.model] : [...MODEL_CHAIN];

  let lastError: unknown;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await anthropic.messages.create({
          ...params,
          model,
        });
        return response;
      } catch (err) {
        lastError = err;

        if (isTransientError(err) && attempt === 0) {
          console.warn(
            `[AI] ${model} attempt ${attempt + 1} failed (transient), retrying in ${RETRY_DELAY_MS}ms...`
          );
          await sleep(RETRY_DELAY_MS);
          continue;
        }

        if (isTransientError(err)) {
          console.warn(
            `[AI] ${model} failed after retry, falling back to next model...`
          );
          break;
        }

        throw err;
      }
    }
  }

  throw lastError;
}

// ── Extended function with Groq fallback + Zod validation ───────────────────

export interface ValidatedCallParams<T = unknown> {
  /** Anthropic API params (model is auto-set from fallback chain) */
  anthropicParams: Omit<MessageCreateParamsNonStreaming, "model">;
  /** Groq fallback params (system prompt, user message, tool schema) */
  groqParams: GroqCallParams;
  /** Zod schema to validate the response against */
  zodSchema: ZodType<T>;
  /** Human-readable description of the schema (used in self-heal prompt) */
  schemaDescription: string;
  /** Tool name to extract from Anthropic response */
  toolName: string;
}

export interface ValidatedCallResult<T> {
  data: T;
  modelUsed: string;
  wasRepaired: boolean;
}

/**
 * Full resilience chain: Claude Sonnet → Claude Haiku → Groq → Self-heal.
 *
 * 1. Try Claude (Sonnet → Haiku with retry)
 * 2. Validate response with Zod
 * 3. If Claude fails entirely → call Groq
 * 4. Validate Groq response with Zod
 * 5. If Groq validation fails → send to Claude Sonnet for repair
 * 6. Return repaired result
 *
 * The user never sees a "bad data" error — the AI fixes itself.
 */
export async function createMessageWithFallbackAndValidation<T>(
  params: ValidatedCallParams<T>
): Promise<ValidatedCallResult<T>> {
  // ── Phase 1: Try Claude (Sonnet → Haiku) ──
  try {
    const response = await createMessageWithFallback(params.anthropicParams);
    const toolUse = response.content.find((b) => b.type === "tool_use");

    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error(
        `No tool_use block in Claude response for ${params.toolName}`
      );
    }

    const parseResult = params.zodSchema.safeParse(toolUse.input);

    if (parseResult.success) {
      return {
        data: parseResult.data as T,
        modelUsed: response.model,
        wasRepaired: false,
      };
    }

    // Claude returned invalid data — log but still return (trusted source)
    console.warn(
      `[AI] Claude response failed Zod validation for ${params.toolName}:`,
      parseResult.error?.message
    );
    return {
      data: toolUse.input as T,
      modelUsed: response.model,
      wasRepaired: false,
    };
  } catch (claudeError) {
    console.warn(
      `[AI] All Claude models failed for ${params.toolName}, falling back to Groq.`,
      claudeError
    );
  }

  // ── Phase 2: Groq fallback ──
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "All Claude models failed and GROQ_API_KEY is not configured"
    );
  }

  try {
    const { result: groqResult, model: groqModel } = await callGroq(
      params.groqParams
    );

    const parseResult = params.zodSchema.safeParse(groqResult);

    if (parseResult.success) {
      console.log(
        `[AI] Groq returned valid response for ${params.toolName}`
      );
      return {
        data: parseResult.data as T,
        modelUsed: groqModel,
        wasRepaired: false,
      };
    }

    // ── Phase 3: Self-healing ──
    console.warn(
      `[AI] Groq response failed validation for ${params.toolName}, attempting self-heal...`
    );

    const repaired = await selfHeal<T>(
      groqResult,
      params.zodSchema,
      params.schemaDescription,
      parseResult.error?.message ?? "Unknown validation error"
    );

    return {
      data: repaired,
      modelUsed: `${groqModel}+claude-repair`,
      wasRepaired: true,
    };
  } catch (groqError) {
    console.error(`[AI] Groq fallback also failed for ${params.toolName}:`, groqError);
    throw groqError;
  }
}
