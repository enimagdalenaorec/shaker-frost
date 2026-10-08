import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { MODEL_CHAINS, type Tier } from "./models";

// The ONLY file that talks to an LLM provider (CLAUDE.md §2). Everything returns zod-validated data.

export type Source = { title: string | null; url: string };
export type LlmResult<T> = {
  data: T;
  model: string;
  ms: number;
  tokensIn: number;
  tokensOut: number;
  /** true when Google Search grounding was actually used */
  grounded: boolean;
  sources: Source[];
};

export class LlmError extends Error {}

let client: GoogleGenAI | null = null;
const ai = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }));

// After search grounding is refused (free tier), stop trying it for a while to save latency.
let searchBlockedUntil = 0;
// Models that rejected a thinking config: call them without it.
const noThinking = new Set<string>();
// Structured extraction/choice needs little deliberation; default (dynamic) thinking costs 5–20 s.
const THINKING: Record<Tier, ThinkingLevel> = { strong: ThinkingLevel.LOW, fast: ThinkingLevel.MINIMAL };

function toJsonSchema(schema: z.ZodType): unknown {
  const json = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

function statusOf(err: unknown): number {
  const m = err instanceof Error ? err.message : String(err);
  const code = m.match(/"code":\s*(\d{3})/)?.[1] ?? m.match(/\b(4\d\d|5\d\d)\b/)?.[1];
  return code ? Number(code) : 0;
}

/**
 * Structured generation with model fallback, one repair retry on invalid JSON,
 * and optional web grounding that silently degrades to model knowledge.
 */
export async function generateJson<T>(opts: {
  schema: z.ZodType<T>;
  system: string;
  user: string;
  tier: Tier;
  temperature?: number;
  search?: boolean;
}): Promise<LlmResult<T>> {
  const responseJsonSchema = toJsonSchema(opts.schema);
  let wantSearch = Boolean(opts.search) && Date.now() > searchBlockedUntil;
  const errors: string[] = [];

  for (const model of MODEL_CHAINS[opts.tier]) {
    let user = opts.user;
    for (let attempt = 0; attempt < 2; attempt++) {
      const started = Date.now();
      try {
        const res = await ai().models.generateContent({
          model,
          contents: user,
          config: {
            systemInstruction: opts.system,
            temperature: opts.temperature ?? 0.2,
            ...(noThinking.has(model) ? {} : { thinkingConfig: { thinkingLevel: THINKING[opts.tier] } }),
            ...(wantSearch
              ? { tools: [{ googleSearch: {} }] }
              : { responseMimeType: "application/json", responseJsonSchema }),
          },
        });
        const text = res.text ?? "";
        const raw = wantSearch ? extractJson(text) : text;
        const parsed = opts.schema.safeParse(JSON.parse(raw));
        if (!parsed.success) {
          // one repair round with the validation error
          user = `${opts.user}\n\nPrethodni odgovor nije prošao validaciju: ${parsed.error.message.slice(0, 600)}\nVrati ispravan JSON.`;
          errors.push(`${model}: invalid JSON shape`);
          continue;
        }
        const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        return {
          data: parsed.data,
          model,
          ms: Date.now() - started,
          tokensIn: res.usageMetadata?.promptTokenCount ?? 0,
          tokensOut: res.usageMetadata?.candidatesTokenCount ?? 0,
          grounded: wantSearch && chunks.length > 0,
          sources: chunks
            .map((c) => c.web)
            .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
            .map((w) => ({ title: w.title ?? null, url: w.uri })),
        };
      } catch (err) {
        const status = statusOf(err);
        errors.push(`${model}: ${status || (err as Error).message.slice(0, 80)}`);
        if (status === 400 && /thinking/i.test((err as Error).message) && !noThinking.has(model)) {
          noThinking.add(model);
          attempt--;
          continue;
        }
        if (wantSearch && status === 429) {
          // grounding not available on this key: fall back to model knowledge everywhere
          searchBlockedUntil = Date.now() + 10 * 60_000;
          wantSearch = false;
          attempt--;
          continue;
        }
        if (err instanceof SyntaxError) continue; // malformed JSON: retry once on the same model
        break; // 429 / 503 / 404 / other: next model in the chain
      }
    }
  }
  throw new LlmError(`Svi modeli su zauzeti ili nedostupni (${errors.join("; ")})`);
}

/** With search tools the model can't use JSON mode, so the JSON is embedded in prose. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1];
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}
