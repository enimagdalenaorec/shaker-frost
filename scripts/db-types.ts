// Generates lib/db/types.ts from the live database schema. Usage: npm run db:types
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is missing in .env.local");

const types = execFileSync(
  "npx",
  ["--yes", "supabase", "gen", "types", "typescript", "--db-url", dbUrl, "--schema", "public"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
mkdirSync("lib/db", { recursive: true });
writeFileSync("lib/db/types.ts", types);
console.log("Wrote lib/db/types.ts");
