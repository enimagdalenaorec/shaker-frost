import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { MODEL_CHAINS, type Tier } from "./models";
import { openaiConfigured, openaiJson } from "./openai";

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

// Shared free capacity is erratic (the same call takes 1 s or 100 s). So we hedge: if a model has not
// answered after HEDGE_MS, the next model in the chain starts in parallel and the first valid answer wins.
// A failed model (429/503/404/timeout) hands over immediately.
const HEDGE_MS: Record<Tier, number> = { strong: 6_000, fast: 3_500 };
const TIMEOUT_MS: Record<Tier, number> = { strong: 20_000, fast: 12_000 };
const LAST_TIMEOUT_MS = 30_000;

// A model that answered "quota exceeded" stays out for a while (free-tier quotas are per day), an overloaded
// one briefly, so later calls don't wait on it again; with every model out, generateJson goes straight to OpenAI.
const COOLDOWN_MS = { quota: 15 * 60_000, overload: 60_000 };
const coolUntil = new Map<string, number>();

type Opts<T> = { schema: z.ZodType<T>; system: string; user: string; tier: Tier; temperature?: number; search?: boolean };

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
 * Structured generation: Gemini and OpenAI (when OPENAI_API_KEY is set) start together and the first valid
 * answer wins; the call fails only when both failed. Free-tier Gemini swings between 1 s and a 30 s timeout or
 * quota errors, so racing a paid model keeps every stage fast and the demo alive.
 * LLM_FORCE_FALLBACK=openai skips Gemini (to test the OpenAI path).
 */
export async function generateJson<T>(opts: Opts<T>): Promise<LlmResult<T>> {
  if (process.env.LLM_FORCE_FALLBACK === "openai") return generateWithOpenai(opts);
  if (!openaiConfigured()) return generateWithGemini(opts);
  return new Promise((resolve, reject) => {
    let settled = false;
    const errors: string[] = [];
    const win = (r: LlmResult<T>) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };
    const lose = (provider: string) => (err: Error) => {
      errors.push(`${provider}: ${err.message.slice(0, 200)}`);
      if (errors.length === 2 && !settled) {
        settled = true;
        reject(new LlmError(errors.join(" | ")));
      }
    };
    generateWithGemini(opts).then(win, lose("Gemini"));
    generateWithOpenai(opts).then(win, lose("OpenAI"));
  });
}

async function generateWithOpenai<T>(opts: Opts<T>): Promise<LlmResult<T>> {
  if (!openaiConfigured()) throw new LlmError("OpenAI fallback nije konfiguriran (OPENAI_API_KEY).");
  const started = Date.now();
  const r = await openaiJson({
    schema: opts.schema,
    jsonSchema: toJsonSchema(opts.schema),
    system: opts.system,
    user: opts.user,
    tier: opts.tier,
    temperature: opts.temperature,
    timeoutMs: LAST_TIMEOUT_MS,
  });
  return { ...r, ms: Date.now() - started, grounded: false, sources: [] };
}

/** The Gemini chain with hedged fallback, a repair retry and optional web grounding. */
function generateWithGemini<T>(opts: Opts<T>): Promise<LlmResult<T>> {
  const all = MODEL_CHAINS[opts.tier];
  const ready = all.filter((m) => (coolUntil.get(m) ?? 0) <= Date.now());
  // nothing ready: hand over to OpenAI at once, or, without it, try the whole chain anyway
  if (!ready.length && openaiConfigured()) return Promise.reject(new LlmError("Svi Gemini modeli su na pauzi (kvota ili preopterećenje)."));
  const models = ready.length ? ready : all;
  const schema = toJsonSchema(opts.schema);
  const errors: string[] = [];

  return new Promise((resolve, reject) => {
    let next = 0;
    let running = 0;
    let settled = false;

    const launch = () => {
      if (settled) return;
      if (next >= models.length) {
        if (running === 0) {
          settled = true;
          reject(new LlmError(`Svi modeli su zauzeti ili nedostupni (${errors.join("; ")})`));
        }
        return;
      }
      const model = models[next++];
      const isLast = next === models.length;
      running++;
      const hedge = isLast ? null : setTimeout(launch, HEDGE_MS[opts.tier]);
      tryModel(model, opts, schema, isLast ? LAST_TIMEOUT_MS : TIMEOUT_MS[opts.tier])
        .then((result) => {
          if (hedge) clearTimeout(hedge);
          if (!settled) {
            settled = true;
            resolve(result);
          }
        })
        .catch((err: Error) => {
          if (hedge) clearTimeout(hedge);
          errors.push(`${model}: ${err.message.slice(0, 80)}`);
          running--;
          launch();
        });
    };
    launch();
  });
}

/** One model: up to two attempts (JSON repair / search fallback). Throws so the chain can move on. */
async function tryModel<T>(model: string, opts: Opts<T>, responseJsonSchema: unknown, timeoutMs: number): Promise<LlmResult<T>> {
  let wantSearch = Boolean(opts.search) && Date.now() > searchBlockedUntil;
  let user = opts.user;
  let lastError: unknown = null;
  const deadline = Date.now() + timeoutMs;

  for (let attempt = 0; attempt < 2; attempt++) {
    const started = Date.now();
    try {
      const res = await ai().models.generateContent({
        model,
        contents: user,
        config: {
          systemInstruction: opts.system,
          temperature: opts.temperature ?? 0.2,
          abortSignal: AbortSignal.timeout(Math.max(1_000, deadline - Date.now())),
          ...(noThinking.has(model) ? {} : { thinkingConfig: { thinkingLevel: THINKING[opts.tier] } }),
          ...(wantSearch ? { tools: [{ googleSearch: {} }] } : { responseMimeType: "application/json", responseJsonSchema }),
        },
      });
      const text = res.text ?? "";
      const parsed = opts.schema.safeParse(JSON.parse(wantSearch ? extractJson(text) : text));
      if (!parsed.success) {
        user = `${opts.user}\n\nPrethodni odgovor nije prošao validaciju: ${parsed.error.message.slice(0, 600)}\nVrati ispravan JSON.`;
        lastError = new Error("invalid JSON shape");
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
      lastError = err;
      const status = statusOf(err);
      if (wantSearch && status === 429) {
        // grounding is not available on this key: use model knowledge (for every call, for a while)
        searchBlockedUntil = Date.now() + 10 * 60_000;
        wantSearch = false;
        attempt--;
        continue;
      }
      if (status === 400 && /thinking/i.test((err as Error).message) && !noThinking.has(model)) {
        noThinking.add(model);
        attempt--;
        continue;
      }
      if (err instanceof SyntaxError) continue; // malformed JSON: one more try on the same model
      if (status === 429) coolUntil.set(model, Date.now() + COOLDOWN_MS.quota);
      else if (status === 503) coolUntil.set(model, Date.now() + COOLDOWN_MS.overload);
      break; // 429 / 503 / 404 / timeout: let the chain move on
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** With search tools the model can't use JSON mode, so the JSON is embedded in prose. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1];
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}
