import "server-only";
import type { z } from "zod";
import { OPENAI_IMAGE, OPENAI_MODELS, type Tier } from "./models";

// Backup provider: used by lib/ai/llm.ts only when every Gemini model failed (quota, overload, timeout).
// Also draws the dish illustrations (openaiImage, used by lib/ai/dish-art.ts).
// Plain fetch to the Chat Completions and Images APIs, so there is no extra dependency.

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
  // GPT-5-family models reason before answering; structured extraction needs little of it.
  const effort = opts.tier === "strong" ? "low" : "minimal";
  const strict: Body = {
    model,
    messages,
    temperature: opts.temperature ?? 0.2,
    reasoning_effort: effort,
    response_format: { type: "json_schema", json_schema: { name: "result", schema: opts.jsonSchema, strict: true } },
  };
  const loose: Body = {
    model,
    messages: [
      { role: "system", content: `${opts.system}\n\nOdgovori isključivo JSON objektom koji odgovara ovoj JSON shemi:\n${JSON.stringify(opts.jsonSchema)}` },
      { role: "user", content: opts.user },
    ],
    temperature: opts.temperature ?? 0.2,
    reasoning_effort: effort,
    response_format: { type: "json_object" },
  };

  // A 400 about an unsupported parameter (temperature, reasoning_effort) drops that parameter;
  // a 400 about the schema switches from strict schema to JSON mode. Dropped params stay dropped.
  const dropped = new Set<string>();
  const without = (b: Body) => Object.fromEntries(Object.entries(b).filter(([k]) => !dropped.has(k)));
  let res;
  let body = strict;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      res = await call(without(body), opts.timeoutMs);
      break;
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status !== 400) throw e;
      const param = ["temperature", "reasoning_effort"].find((p) => e.message.includes(p) && !dropped.has(p));
      if (param) {
        dropped.add(param);
        continue;
      }
      if (body === strict) {
        body = loose;
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

type ImageResponse = {
  error?: { message?: string };
  data?: { b64_json?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
};

/**
 * One transparent WebP from the GPT image model. With `references` (style examples) it uses the edits
 * endpoint, which takes input images; if that is refused (400), it draws from the prompt alone.
 */
export async function openaiImage(opts: {
  prompt: (withReferences: boolean) => string;
  references?: { name: string; bytes: Uint8Array }[];
  timeoutMs: number;
}): Promise<{ bytes: Uint8Array; model: string; usedReferences: boolean; tokensIn: number; tokensOut: number }> {
  const { model, quality } = OPENAI_IMAGE;
  const params = { model, quality, size: "1024x1024", background: "transparent", output_format: "webp", output_compression: "80" };
  const auth = { authorization: `Bearer ${process.env.OPENAI_API_KEY}` };
  const signal = AbortSignal.timeout(opts.timeoutMs);

  const send = async (withReferences: boolean) => {
    let res: Response;
    if (withReferences) {
      const form = new FormData();
      for (const [k, v] of Object.entries(params)) form.append(k, v);
      form.append("prompt", opts.prompt(true));
      for (const r of opts.references!) form.append("image[]", new Blob([new Uint8Array(r.bytes)], { type: "image/png" }), r.name);
      res = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: auth, body: form, signal });
    } else {
      res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { ...auth, "content-type": "application/json" },
        body: JSON.stringify({ ...params, output_compression: Number(params.output_compression), prompt: opts.prompt(false) }),
        signal,
      });
    }
    const json = (await res.json().catch(() => ({}))) as ImageResponse;
    if (!res.ok) throw Object.assign(new Error(`OpenAI image ${res.status}: ${json.error?.message ?? ""}`.slice(0, 300)), { status: res.status });
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI image: empty response");
    return { bytes: Buffer.from(b64, "base64"), tokensIn: json.usage?.input_tokens ?? 0, tokensOut: json.usage?.output_tokens ?? 0 };
  };

  const withReferences = Boolean(opts.references?.length);
  try {
    return { ...(await send(withReferences)), model: `openai:${model}`, usedReferences: withReferences };
  } catch (err) {
    if (!withReferences || (err as { status?: number }).status !== 400) throw err;
    return { ...(await send(false)), model: `openai:${model}`, usedReferences: false };
  }
}
