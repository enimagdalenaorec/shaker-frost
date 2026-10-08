import "server-only";
import { generateJson } from "@/lib/ai/llm";
import { ExtractedRecipe } from "@/lib/ai/schemas";
import { PROMPTS } from "@/lib/ai/prompts";
import { hr } from "@/lib/i18n/hr";
import { EXAMPLE_FIXTURES } from "./examples-data";

// Stage 0 (CLAUDE.md §8): turn a URL / pasted text / example into one RawRecipe.
// Dedicated parsers: index.hr API, coolinarika JSON-LD. Everything else (and an incomplete parse) → LLM extraction.

export type IngestMethod = "jsonld" | "site_api" | "llm_html" | "web" | "pasted";
export type RawRecipe = {
  title: string;
  ingredients: string[];
  steps: string[];
  servings: number | null;
  notes: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  method: IngestMethod;
  model?: string;
};

export class IngestError extends Error {}

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

/** Hosts with a dedicated parser; every other site goes to LLM extraction (CLAUDE.md §8). */
function dedicatedParser(host: string): "index" | "coolinarika" | null {
  if (host.endsWith("recepti.index.hr")) return "index";
  if (host.endsWith("coolinarika.com")) return "coolinarika";
  return null;
}

export async function ingestUrl(url: string, onNotice?: (message: string) => void): Promise<RawRecipe> {
  const u = new URL(url);
  const parser = dedicatedParser(u.hostname);
  let parsed: RawRecipe | null = null;
  let html: string | null = null;
  if (parser === "index") {
    const id = u.pathname.match(/\/recept\/(\d+)/)?.[1];
    if (id) parsed = await fromIndexHr(id, url).catch(() => null);
  }
  if (!parsed) html = await fetchText(url);
  if (parser === "coolinarika") parsed = fromJsonLd(html!, url);
  if (parsed && isComplete(parsed)) return parsed;

  // Any other site, or a dedicated parser that came back empty: the LLM reads the page (slower, but works anywhere).
  onNotice?.(hr.ingest.llmFallback);
  html ??= await fetchText(url);
  const ld = parsed ?? fromJsonLd(html, url);
  const text = recipePageText(html, ld);
  if (text.length < 300) throw new IngestError(hr.ingest.unreadable);
  const recipe = await extractWithLlm(text, { sourceUrl: url, sourceName: siteName(url), method: "llm_html" });
  return { ...recipe, imageUrl: ld?.imageUrl ?? null };
}

/** A parse the rest of the pipeline can work with: ingredients AND steps (24sata's JSON-LD, e.g., has no steps). */
function isComplete(r: RawRecipe): boolean {
  return r.ingredients.length >= 2 && r.steps.length >= 1;
}

/**
 * The text the LLM extracts from: the page's schema.org Recipe (or the incomplete parse) when there is one (often only
 * partial), then the visible text of <article>/<main> (or the whole body), capped at 15k characters.
 */
function recipePageText(html: string, ld: RawRecipe | null): string {
  const ldText = ld
    ? `STRUKTURIRANI PODACI STRANICE (mogu biti nepotpuni):\nNaslov: ${ld.title}\nSastojci:\n${ld.ingredients.join("\n")}\n${ld.steps.length ? `Koraci:\n${ld.steps.join("\n")}\n` : ""}\n`
    : "";
  const main = html.match(/<article[\s\S]*<\/article>/i)?.[0] ?? html.match(/<main[\s\S]*<\/main>/i)?.[0];
  const body = main && htmlToText(main).length > 500 ? main : html;
  return (ldText + "VIDLJIVI TEKST:\n" + htmlToText(body.replace(/<(aside|form|figure)[\s\S]*?<\/\1>/gi, " "))).slice(0, 15000);
}

export async function ingestText(text: string): Promise<RawRecipe> {
  return extractWithLlm(text.slice(0, 15000), { sourceUrl: null, sourceName: null, method: "pasted" });
}

/** Example chips use saved real pages (fixtures/recipes), so the demo also works offline. */
export async function ingestExample(slug: string): Promise<RawRecipe> {
  const fixture = EXAMPLE_FIXTURES[slug];
  if (!fixture) throw new IngestError("Nepoznat primjer.");
  const { url, jsonld } = fixture;
  const recipe = mapJsonLdRecipe(jsonld, url);
  if (!recipe) throw new IngestError("Primjer nije ispravan.");
  return recipe;
}

// ---------------------------------------------------------------------------------------------

/** Statuses of a site that blocks our server (allrecipes answers 402), as opposed to a page that is down or missing. */
const REFUSED = new Set([401, 402, 403, 429, 451]);

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" }, signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (res && REFUSED.has(res.status)) throw new IngestError(hr.ingest.refused);
  const html = res?.ok ? await res.text().catch(() => null) : null;
  if (html == null) throw new IngestError(hr.ingest.unreadable);
  return html;
}

async function fromIndexHr(id: string, url: string): Promise<RawRecipe> {
  const res = await fetch(`https://recepti-api.index.hr/api/services/app/Recipe/Get?Id=${id}`, {
    headers: { "user-agent": UA, accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  const json = res?.ok ? ((await res.json()) as { result?: IndexRecipe }) : null;
  const r = json?.result;
  if (!r?.name) throw new IngestError("Index recept nije dostupan.");
  const ingredients = (r.ingredients ?? []).flatMap((group) =>
    (group.ingredients ?? []).map((i) => [i.quantity, i.unit, i.name].filter((x) => x != null && x !== "").join(" ").trim()),
  );
  const steps = (r.preparationSteps ?? [])
    .sort((a, b) => Number(a.order) - Number(b.order))
    .flatMap((s) => splitHtmlSteps(s.text ?? ""));
  return {
    title: decodeEntities(r.name),
    ingredients: ingredients.filter(Boolean),
    steps,
    servings: r.servingsNumberDefault ? Number(r.servingsNumberDefault) : null,
    notes: r.remark ? htmlToText(r.remark) : null,
    imageUrl: null,
    sourceUrl: url,
    sourceName: "Index Recepti",
    method: "site_api",
  };
}

type IndexRecipe = {
  name: string;
  servingsNumberDefault?: number | string;
  remark?: string;
  ingredients?: { name?: string; ingredients?: { name: string; quantity?: string | number | null; unit?: string | null }[] }[];
  preparationSteps?: { order: string | number; text?: string }[];
};

/** index.hr keeps all steps in one HTML blob with <h1> headings per step. */
function splitHtmlSteps(html: string): string[] {
  const parts = html.split(/<h1[^>]*>/i).map((p) => htmlToText(p.replace(/<s>\d+<\/s>/g, ""))).filter((p) => p.length > 3);
  return parts.length ? parts : [htmlToText(html)];
}

function fromJsonLd(html: string, url: string): RawRecipe | null {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const nodes = (Array.isArray(data) ? data : [data]).flatMap((d) =>
      d && typeof d === "object" && "@graph" in d ? ((d as { "@graph": unknown[] })["@graph"] ?? []) : [d],
    );
    for (const node of nodes) {
      const type = (node as { "@type"?: unknown })?.["@type"];
      if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) {
        const recipe = mapJsonLdRecipe(node as Record<string, unknown>, url);
        if (recipe) return recipe;
      }
    }
  }
  return null;
}

function mapJsonLdRecipe(r: Record<string, unknown>, url: string): RawRecipe | null {
  // some sites (coolinarika) print missing units as "undefined": "1 jaje undefined"
  const ingredients = ((r.recipeIngredient as unknown[]) ?? [])
    .map((x) => decodeEntities(String(x)).replace(/\b(undefined|null)\b/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (!ingredients.length) return null;
  const steps = flattenInstructions(r.recipeInstructions);
  const yieldRaw = Array.isArray(r.recipeYield) ? r.recipeYield[0] : r.recipeYield;
  const servings = yieldRaw != null ? Number(String(yieldRaw).match(/\d+/)?.[0]) || null : null;
  const image = Array.isArray(r.image) ? r.image[0] : r.image;
  return {
    title: decodeEntities(String(r.name ?? "Recept")),
    ingredients,
    steps,
    servings,
    notes: null,
    imageUrl: typeof image === "string" ? image : ((image as { url?: string })?.url ?? null),
    sourceUrl: url,
    sourceName: siteName(url),
    method: "jsonld",
  };
}

function flattenInstructions(x: unknown): string[] {
  if (!x) return [];
  if (typeof x === "string") return htmlToText(x).split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(x)) return x.flatMap(flattenInstructions);
  const o = x as { "@type"?: string; text?: string; itemListElement?: unknown };
  if (o.itemListElement) return flattenInstructions(o.itemListElement);
  return o.text ? [htmlToText(o.text)] : [];
}

async function extractWithLlm(
  text: string,
  meta: { sourceUrl: string | null; sourceName: string | null; method: IngestMethod },
): Promise<RawRecipe> {
  const { data, model } = await generateJson({
    schema: ExtractedRecipe,
    tier: "strong",
    system: PROMPTS.extract.system,
    user: PROMPTS.extract.user(text),
    temperature: 0,
  });
  if (!data.is_recipe || !data.ingredients.length) throw new IngestError("U tekstu nismo pronašli recept.");
  return { ...data, imageUrl: null, ...meta, model };
}

function siteName(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host.includes("coolinarika")) return "Coolinarika";
  if (host.includes("index.hr")) return "Index Recepti";
  return host;
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|\/p|\/li|\/h\d|\/div)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", frac12: "½" };
export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+\d*);/gi, (m, name) => NAMED[name.toLowerCase()] ?? m);
}
