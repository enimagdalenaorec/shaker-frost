import "server-only";
import type { z } from "zod";
import { OPENAI_MODELS, type Tier } from "./models";

// Backup provider: used by lib/ai/llm.ts only when every Gemini model failed (quota, overload, timeout).
// Plain fetch to the Chat Completions API, so there is no extra dependency.

export const openaiConfigured = () => Boolean(process.env.OPENAI_API_KEY);

type Body = Record<string, unknown>;

async function call(body: Body, timeoutMs: number) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    model?: string;
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  if (!res.ok) throw Object.assign(new Error(`OpenAI ${res.status}: ${json.error?.message ?? ""}`.slice(0, 300)), { status: res.status });
  return json;
}

/**
 * Structured JSON from OpenAI. Tries strict JSON-schema output first; if the model or schema is not
 * accepted (400), falls back to JSON mode with the schema in the prompt. Some models reject a custom
 * temperature, so that is dropped on a matching 400 as well. Always validated with zod by the caller.
 */
export async function openaiJson<T>(opts: {
  schema: z.ZodType<T>;
  jsonSchema: unknown;
  system: string;
  user: string;
  tier: Tier;
  temperature?: number;
  timeoutMs: number;
}): Promise<{ data: T; model: string; tokensIn: number; tokensOut: number }> {
  const model = OPENAI_MODELS[opts.tier];
  const messages = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ];
  const strict: Body = {
    model,
    messages,
    temperature: opts.temperature ?? 0.2,
    response_format: { type: "json_schema", json_schema: { name: "result", schema: opts.jsonSchema, strict: true } },
  };
  const loose: Body = {
    model,
    messages: [
      { role: "system", content: `${opts.system}\n\nOdgovori isključivo JSON objektom koji odgovara ovoj JSON shemi:\n${JSON.stringify(opts.jsonSchema)}` },
      { role: "user", content: opts.user },
    ],
    temperature: opts.temperature ?? 0.2,
    response_format: { type: "json_object" },
  };

  let res;
  let body = strict;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      res = await call(body, opts.timeoutMs);
      break;
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status !== 400) throw e;
      if (/temperature/i.test(e.message) && "temperature" in body) {
        const { temperature: _drop, ...rest } = body;
        body = rest;
        continue;
      }
      if (body.response_format && (body.response_format as { type: string }).type === "json_schema") {
        const { temperature: _t, ...looseRest } = loose;
        body = "temperature" in body ? loose : looseRest;
        continue;
      }
      throw e;
    }
  }
  if (!res) throw new Error("OpenAI: no response");

  const text = res.choices?.[0]?.message?.content ?? "";
  const parsed = opts.schema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error(`OpenAI: invalid JSON shape (${parsed.error.message.slice(0, 120)})`);
  return {
    data: parsed.data,
    model: `openai:${res.model ?? model}`,
    tokensIn: res.usage?.prompt_tokens ?? 0,
    tokensOut: res.usage?.completion_tokens ?? 0,
  };
}
