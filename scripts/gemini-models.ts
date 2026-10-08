// Lists the Gemini models our key can use for generateContent. Never prints the key.
// Usage: npm run llm:models
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error("GEMINI_API_KEY is missing in .env.local");

type Model = { name: string; displayName?: string; supportedGenerationMethods?: string[]; inputTokenLimit?: number };

const models: Model[] = [];
let pageToken = "";
do {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200${pageToken ? `&pageToken=${pageToken}` : ""}`,
    { headers: { "x-goog-api-key": key } },
  );
  if (!res.ok) {
    console.error(`Gemini API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    process.exit(1);
  }
  const body = (await res.json()) as { models?: Model[]; nextPageToken?: string };
  models.push(...(body.models ?? []));
  pageToken = body.nextPageToken ?? "";
} while (pageToken);

const usable = models.filter((m) => m.supportedGenerationMethods?.includes("generateContent"));
console.log(`Key works. ${usable.length} models support generateContent:\n`);
for (const m of usable) console.log(`  ${m.name.replace("models/", "").padEnd(45)} ${m.displayName ?? ""}`);
