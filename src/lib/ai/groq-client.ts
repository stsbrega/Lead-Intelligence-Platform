/**
 * Groq API wrapper using the OpenAI SDK.
 *
 * Groq's API is fully OpenAI-compatible, so we use the `openai` package
 * with a custom baseURL. This means if we ever add OpenAI itself as
 * another fallback, no new dependency is needed.
 *
 * Model: llama-3.3-70b-versatile (best Groq model for structured output)
 */

import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const GROQ_MODEL = "llama-3.3-70b-versatile";

/**
 * Convert an Anthropic-style tool schema to OpenAI function calling format.
 *
 * Anthropic: { name, description, input_schema: { type, required, properties } }
 * OpenAI:    { type: "function", function: { name, description, parameters: { type, required, properties } } }
 *
 * The inner JSON Schema is identical — only the wrapper changes.
 */
function convertToolSchema(anthropicTool: {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}): OpenAI.Chat.Completions.ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: anthropicTool.name,
      description: anthropicTool.description,
      parameters: anthropicTool.input_schema as OpenAI.FunctionParameters,
    },
  };
}

export interface GroqCallParams {
  system: string;
  userMessage: string;
  tool: {
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  };
  maxTokens: number;
}

/**
 * Call Groq with OpenAI-format function calling.
 * Returns the raw parsed JSON (not validated — caller must validate with Zod).
 * Throws on network/API errors or if Groq doesn't return a tool call.
 */
export async function callGroq(params: GroqCallParams): Promise<{
  result: unknown;
  model: string;
}> {
  const openaiTool = convertToolSchema(params.tool);

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: params.maxTokens,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.userMessage },
    ],
    tools: [openaiTool],
    tool_choice: {
      type: "function",
      function: { name: params.tool.name },
    },
  });

  const choice = response.choices[0];
  const toolCall = choice?.message?.tool_calls?.[0];

  if (!toolCall || toolCall.function.name !== params.tool.name) {
    throw new Error(
      `Groq did not return expected tool call "${params.tool.name}"`
    );
  }

  const result = JSON.parse(toolCall.function.arguments);
  return { result, model: `groq/${GROQ_MODEL}` };
}
