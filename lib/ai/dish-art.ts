import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { adminDb } from "@/lib/db/admin";
import { openaiConfigured, openaiImage } from "./openai";
import { PROMPTS } from "./prompts";

// Dish illustration: a small cut-paper picture of the dish in the team's style, drawn by the OpenAI image
// model in the background while (and after) the pipeline runs. It never blocks or fails a run: the recipe
// page shows a placeholder while recipes.art_status = 'pending' and pops the picture in when it is 'done'.
// One picture per dish (dish_art), so repeats and the example recipes cost nothing.

export const artEnabled = openaiConfigured;

const BUCKET = "dish-art";
// Team illustrations sent as style references (bundled for the veganize route in next.config.ts).
const REFERENCES = ["sarma-pot.png", "burek.png"];

export type ArtResult = { status: "done" | "error"; url: string | null; cached: boolean; ms: number };

export async function drawDishArt(p: { recipeId: string; runId: string | null; key: string; dish: string; ingredients: string[] }): Promise<ArtResult> {
  const db = adminDb();
  const started = Date.now();
  const version = PROMPTS.art.version;
  let model: string | null = null;
  let usage: { tokensIn: number; tokensOut: number; usedReferences: boolean } | null = null;
  try {
    const { data: hit } = await db.from("dish_art").select("url").eq("key", p.key).eq("prompt_version", version).maybeSingle();
    let url = hit?.url ?? null;
    if (!url) {
      const references = await Promise.all(
        REFERENCES.map(async (name) => ({ name, bytes: await readFile(path.join(process.cwd(), "public", "illustrations", name)) })),
      ).catch(() => []);
      const img = await openaiImage({ prompt: (withRefs) => PROMPTS.art.prompt(p, withRefs), references, timeoutMs: 50_000 });
      model = img.model;
      usage = { tokensIn: img.tokensIn, tokensOut: img.tokensOut, usedReferences: img.usedReferences };
      // a new file name per drawing, so a CDN never serves an older picture of the same dish
      const file = `${version}/${p.key}-${Date.now().toString(36)}.webp`;
      const { error } = await db.storage.from(BUCKET).upload(file, img.bytes, { contentType: "image/webp", cacheControl: "31536000" });
      if (error) throw new Error(error.message);
      url = db.storage.from(BUCKET).getPublicUrl(file).data.publicUrl;
      await db.from("dish_art").upsert({ key: p.key, dish: p.dish, path: file, url, model: img.model, prompt_version: version });
    }
    await db.from("recipes").update({ art_url: url, art_status: "done" }).eq("id", p.recipeId);
    const ms = Date.now() - started;
    await logStep(p.runId, { model, ms, output: { cached: Boolean(hit), url, ...usage } });
    return { status: "done", url, cached: Boolean(hit), ms };
  } catch (err) {
    const ms = Date.now() - started;
    await db.from("recipes").update({ art_status: "error" }).eq("id", p.recipeId);
    await logStep(p.runId, { model, ms, error: err instanceof Error ? err.message : String(err) });
    return { status: "error", url: null, cached: false, ms };
  }

  async function logStep(runId: string | null, s: { model: string | null; ms: number; output?: unknown; error?: string }) {
    if (!runId) return;
    await db.from("agent_steps").insert({
      run_id: runId, stage: "art", model: s.model, prompt_version: version, output: (s.output ?? null) as never, ms: s.ms, error: s.error ?? null,
    });
  }
}
