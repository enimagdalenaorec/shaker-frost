// Direct Postgres connection for scripts (migrations, catalog loading, seeding). Server-side only.
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local", quiet: true });

export async function connect(): Promise<pg.Client> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing in .env.local (run: npm run env:check)");
  }
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}
