// Facet matching shared by the basket candidates and the recipe screen (CLAUDE.md §4.1).

/** okus value for "no flavour": also matches products that list no flavour at all. */
export const PLAIN = "bez okusa / natur";

/** Product facets are lists (atr_okus …); a row may still carry a single value. */
export function facetMatches(row: Record<string, unknown>, key: string, want: string): boolean {
  const v = row[key];
  const have = Array.isArray(v) ? (v as string[]) : v == null ? [] : [String(v)];
  return have.includes(want) || (key === "okus" && want === PLAIN && have.length === 0);
}
