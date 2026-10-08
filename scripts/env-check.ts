// Prints set/missing for every variable in .env.local. Never prints a value.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

type Check = { name: string; required: boolean; valid?: (v: string) => string | null };

const checks: Check[] = [
  { name: "LLM_PROVIDER", required: true, valid: (v) => (v === "gemini" || v === "openai" ? null : "must be gemini or openai") },
  { name: "GEMINI_API_KEY", required: true },
  { name: "NEXT_PUBLIC_SUPABASE_URL", required: true, valid: (v) => (/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(v) ? null : "expected https://<ref>.supabase.co") },
  { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", required: true },
  { name: "SUPABASE_SECRET_KEY", required: true },
  {
    name: "DATABASE_URL",
    required: true,
    valid: (v) => {
      if (!/^postgres(ql)?:\/\//.test(v)) return "expected postgresql://...";
      if (v.includes("[YOUR-PASSWORD]")) return "replace [YOUR-PASSWORD] with the database password";
      return null;
    },
  },
  { name: "DEMO_PASSWORD", required: true, valid: (v) => (v.length >= 8 ? null : "use at least 8 characters") },
  { name: "ENABLE_WEB_FALLBACK", required: false },
  { name: "OPENAI_API_KEY", required: false },
  { name: "OPENAI_MODEL_STRONG", required: false },
  { name: "OPENAI_MODEL_FAST", required: false },
  { name: "LLM_MODEL_FAST", required: false },
  { name: "LLM_MODEL_STRONG", required: false },
];

let failed = 0;
for (const c of checks) {
  const v = process.env[c.name]?.trim() ?? "";
  if (!v) {
    if (c.required) failed++;
    console.log(`${c.required ? "✗" : "·"} ${c.name.padEnd(38)} ${c.required ? "MISSING" : "not set (optional)"}`);
    continue;
  }
  const problem = c.valid?.(v) ?? null;
  if (problem) failed++;
  console.log(`${problem ? "✗" : "✓"} ${c.name.padEnd(38)} ${problem ? `set, but ${problem}` : "set"}`);
}

console.log(failed ? `\n${failed} problem(s).` : "\nAll good.");
process.exit(failed ? 1 : 0);
