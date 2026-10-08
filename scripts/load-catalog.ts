// Loads the catalog CSVs written by scripts/catalog/export_handoff.py (concepts, products, offers)
// and rebuilds the catalog in one transaction: the app keeps seeing the old catalog until the commit.
// Usage: npm run load:catalog [-- fixtures/catalog]
import { createReadStream } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import type pg from "pg";
import { connect } from "./lib/db";

// Columns per table, in CSV header names (= table column names). Array columns arrive as JSON lists.
const TABLES = {
  concepts: {
    columns: ["concept_id", "naziv", "run", "obitelj", "roditelj", "razina", "put_nazivi", "korijeni", "sinonimi", "zamjenjuje"],
    arrays: ["korijeni", "sinonimi", "zamjenjuje"],
  },
  products: {
    columns: [
      "product_key", "has_barcode", "name", "brand", "brands", "url",
      "vegan_class", "vegan_reason", "evidence_class", "vegan_evidence",
      "kcal", "fat", "saturated_fat", "carbohydrates", "sugars", "protein", "salt", "fiber",
      "nutrition_izvor", "nutrition_izvor_opis", "nutrition_procijenjeno", "nutrition_nedostaje", "nutrition_praznina_opis",
      "concept_id", "concept_put", "std_naziv",
      "atr_okus", "atr_zasladenost", "atr_prehrambena_svojstva", "atr_oblik_obrada", "atr_namjena", "atr_porijeklo",
      "pakiranje_kolicina", "pakiranje_jedinica", "pakiranje_komada", "tags", "search_text",
    ],
    arrays: ["brands", "nutrition_nedostaje", "concept_put", "atr_okus", "atr_zasladenost", "atr_prehrambena_svojstva",
      "atr_oblik_obrada", "atr_namjena", "atr_porijeklo", "tags"],
  },
  offers: {
    columns: ["product_key", "seller", "source", "price", "regular_price", "akcija", "akcija_price",
      "n_stores", "n_stores_akcija", "prilika", "price_date", "url"],
    arrays: [],
  },
} as const;

const MAX_PARAMS = 60000; // Postgres allows 65,535 parameters per statement

async function loadTable(client: pg.Client, dir: string, table: keyof typeof TABLES) {
  const { columns, arrays } = TABLES[table];
  const batchSize = Math.floor(MAX_PARAMS / columns.length);
  const parser = createReadStream(path.join(dir, `${table}.csv`)).pipe(parse({ columns: true, bom: true }));
  let batch: unknown[][] = [];
  let total = 0;

  const flush = async () => {
    if (!batch.length) return;
    const tuples = batch.map((_, r) => `(${columns.map((_, c) => `$${r * columns.length + c + 1}`).join(",")})`);
    await client.query(`insert into ${table} (${columns.join(",")}) values ${tuples.join(",")}`, batch.flat());
    total += batch.length;
    process.stdout.write(`\r  ${table}: ${total} rows`);
    batch = [];
  };

  for await (const rec of parser as AsyncIterable<Record<string, string>>) {
    batch.push(
      columns.map((col) => {
        const v = rec[col];
        if (v === undefined || v === "") return (arrays as readonly string[]).includes(col) ? [] : null;
        return (arrays as readonly string[]).includes(col) ? (JSON.parse(v) as string[]) : v;
      }),
    );
    if (batch.length >= batchSize) await flush();
  }
  await flush();
  process.stdout.write("\n");
}

const dir = process.argv[2] ?? "fixtures/catalog";
const client = await connect();
try {
  await client.query("begin");
  await client.query("truncate offers, products, concepts, chains");
  await loadTable(client, dir, "concepts");
  await loadTable(client, dir, "products");
  // chains first appear in offers.csv; create them before the offers that reference them
  const sellers = new Set<string>();
  for await (const rec of createReadStream(path.join(dir, "offers.csv")).pipe(parse({ columns: true, bom: true })) as AsyncIterable<Record<string, string>>)
    sellers.add(`${rec.seller}|${rec.source}`);
  for (const s of sellers) {
    const [code, source] = s.split("|");
    await client.query(
      "insert into chains (code, name, kind) values ($1, chain_display_name($1), $2) on conflict (code) do nothing",
      [code, source === "trgovina" ? "webshop" : "store"],
    );
  }
  await loadTable(client, dir, "offers");
  console.log("  rebuilding search, concept counts, best offers …");
  const { rows } = await client.query<{ refresh_catalog: Record<string, number> }>("select refresh_catalog()");
  await client.query("commit");
  console.log(rows[0].refresh_catalog);
} catch (err) {
  await client.query("rollback");
  throw err;
} finally {
  await client.end();
}
