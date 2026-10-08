// Loads supabase/seed/knowledge.sql (ingredients + substitution rules). Usage: npm run seed:knowledge
import { readFile } from "node:fs/promises";
import { connect } from "./lib/db";

const client = await connect();
try {
  await client.query("begin");
  await client.query(await readFile("supabase/seed/knowledge.sql", "utf8"));
  await client.query("commit");
  const { rows } = await client.query(
    "select (select count(*) from ingredients) as ingredients, (select count(*) from substitution_rules) as rules",
  );
  console.log("Seeded:", rows[0]);
} catch (err) {
  await client.query("rollback");
  throw err;
} finally {
  await client.end();
}
