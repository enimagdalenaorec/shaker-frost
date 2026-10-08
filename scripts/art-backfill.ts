// Draws the dish illustration for finished recipes that have none (made before illustrations existed).
// One picture per dish (dish_art), so this costs ≈ $0.02 per new dish; dishes already drawn are free.
// Usage: npm run art:backfill             (recipes of logged-in users: what the Recepti list shows)
//        npm run art:backfill -- --all    (also guest runs)
//        npm run art:backfill -- --dry    (only list what would be drawn)
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const { adminDb } = await import("../lib/db/admin");
const { artEnabled, drawDishArt } = await import("../lib/ai/dish-art");
const { norm } = await import("../lib/ai/pipeline");

if (!artEnabled()) throw new Error("OPENAI_API_KEY is missing in .env.local");
const all = process.argv.includes("--all");
const dry = process.argv.includes("--dry");

const db = adminDb();
let query = db.from("recipes").select("id, raw_text, recipe_ingredients(raw_text, position)").eq("status", "done").is("art_url", null);
if (!all) query = query.not("user_id", "is", null);
const { data, error } = await query.order("created_at");
if (error) throw new Error(error.message);

// the pipeline keys a dish by the original title, which is the first line of raw_text
const recipes = (data ?? []).map((r) => {
  const dish = r.raw_text.split("\n")[0].trim();
  const ingredients = [...(r.recipe_ingredients as { raw_text: string; position: number }[])].sort((a, b) => a.position - b.position).map((i) => i.raw_text);
  return { id: r.id, dish, key: norm(dish) || r.id, ingredients };
});
console.log(`${recipes.length} recipe(s) without a picture, ${new Set(recipes.map((r) => r.key)).size} dish(es).`);

// one at a time: the second recipe of a dish then comes straight from the cache
for (const r of recipes) {
  if (dry) {
    console.log(`  · ${r.dish}`);
    continue;
  }
  const art = await drawDishArt({ recipeId: r.id, runId: null, key: r.key, dish: r.dish, ingredients: r.ingredients });
  console.log(`${art.status === "done" ? "✓" : "✗"} ${r.dish.padEnd(40)} ${String(art.ms).padStart(6)} ms${art.cached ? "  (from cache)" : ""}`);
}
