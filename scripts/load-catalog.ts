// Loads a catalog CSV in the CLAUDE.md §4.2 import format (one row per product × store) and rebuilds the catalog.
// The same command loads the mock now and the teammate's real export later.
// Usage: npm run load:catalog -- path/to/file.csv
import { createReadStream } from "node:fs";
import { parse } from "csv-parse";
import { connect } from "./lib/db";

const IMPORT_COLUMNS = [
  "item_id", "barcode", "name", "brand", "image_url", "product_url",
  "concept_id", "concept", "concept_parent", "concept_group", "concept_confidence",
  "okus", "zasladeno", "namjena", "oblik", "obogaceno", "eko", "tags",
  "size_value", "size_unit", "pack_count",
  "vegan_status", "provjeri", "vegan_evidence",
  "energy_kcal", "fat", "saturated_fat", "carbohydrates", "sugars", "proteins", "salt", "fiber",
  "nutrition_source", "search_text",
  "store_chain", "chain_logo_url", "store_id", "store_address", "store_city",
  "price", "regular_price", "price_date",
] as const;

const BATCH = 1000; // 1000 rows × 42 columns stays under Postgres' 65,535 parameter limit

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run load:catalog -- path/to/file.csv");
  process.exit(1);
}

const client = await connect();
try {
  await client.query("truncate import_rows");
  const parser = createReadStream(file).pipe(
    parse({ columns: (h: string[]) => h.map((c) => c.trim().toLowerCase()), bom: true, relax_column_count: true }),
  );

  let header: string[] | null = null;
  let batch: (string | null)[][] = [];
  let total = 0;

  const flush = async () => {
    if (!batch.length) return;
    const values: (string | null)[] = [];
    const tuples = batch.map((row, r) => {
      values.push(...row);
      return `(${row.map((_, c) => `$${r * IMPORT_COLUMNS.length + c + 1}`).join(",")})`;
    });
    await client.query(`insert into import_rows (${IMPORT_COLUMNS.join(",")}) values ${tuples.join(",")}`, values);
    total += batch.length;
    process.stdout.write(`\r  ${total} rows staged`);
    batch = [];
  };

  for await (const rec of parser as AsyncIterable<Record<string, string>>) {
    if (!header) {
      header = Object.keys(rec);
      const missing = IMPORT_COLUMNS.filter((c) => !header!.includes(c));
      const ignored = header.filter((c) => !(IMPORT_COLUMNS as readonly string[]).includes(c));
      if (missing.length) console.log(`  missing columns (left empty): ${missing.join(", ")}`);
      if (ignored.length) console.log(`  ignored columns: ${ignored.join(", ")}`);
    }
    batch.push(IMPORT_COLUMNS.map((c) => (rec[c] === undefined || rec[c] === "" ? null : rec[c])));
    if (batch.length >= BATCH) await flush();
  }
  await flush();
  console.log(`\n  rebuilding catalog …`);
  const { rows } = await client.query<{ refresh_catalog: Record<string, number> }>("select refresh_catalog()");
  console.log(rows[0].refresh_catalog);
} finally {
  await client.end();
}
