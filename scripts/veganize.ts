// Runs the full pipeline from the terminal and prints every stage.
// Usage: npm run veganize -- sarma            (example slug)
//        npm run veganize -- https://...      (any recipe URL)
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const { runPipeline } = await import("../lib/ai/pipeline");

const arg = process.argv[2] ?? "palacinke";
const input = /^https?:\/\//.test(arg) ? { url: arg } : { example: arg };

const id = await runPipeline(input, (e) => {
  if (e.type === "stage" && e.status === "done") console.log(`✓ ${e.stage.padEnd(13)} ${String(e.ms).padStart(6)} ms  ${e.summary}`);
  if (e.type === "stage" && e.status === "start") process.stdout.write("");
  if (e.type === "error") console.log(`✗ ${e.stage}: ${e.message}`);
  if (e.type === "done") console.log(`\nDone in ${e.ms} ms → /recept/${e.recipeId}`);
  if (e.type === "stage" && e.status === "done" && (e.stage === "analyze" || e.stage === "alternatives")) console.log(JSON.stringify(e.detail, null, 1).slice(0, 1800));
});
process.exit(id ? 0 : 1);
