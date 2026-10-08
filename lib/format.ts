const eur = new Intl.NumberFormat("hr-HR", { style: "currency", currency: "EUR" });
const num = new Intl.NumberFormat("hr-HR", { maximumFractionDigits: 1 });

/** 1.19 → "1,19 €" */
export const formatPrice = (value: number | null | undefined) => (value == null ? "–" : eur.format(value));

/** 1000 ml → "1 L", 600 g → "600 g", 1500 g → "1,5 kg" */
export function formatSize(qty: number | null | undefined, unit: string | null | undefined, pack = 1): string | null {
  if (!qty || !unit) return null;
  const single =
    unit === "ml" && qty >= 1000 ? `${num.format(qty / 1000)} L`
    : unit === "g" && qty >= 1000 ? `${num.format(qty / 1000)} kg`
    : unit === "kom" ? `${num.format(qty)} kom`
    : `${num.format(qty)} ${unit}`;
  return pack > 1 ? `${pack} × ${single}` : single;
}

/** True when a product name already spells out its size ("Tofu 200 g"), so we don't repeat it. */
export function nameHasSize(name: string, size: string | null): boolean {
  if (!size) return true;
  return name.toLowerCase().replace(/\s+/g, " ").includes(size.toLowerCase());
}

/** "2,58 €/kg" or "1,39 €/L" */
export function formatUnitPrice(value: number | null | undefined, unit: string | null | undefined): string | null {
  if (value == null || !unit || unit === "kom") return null;
  return `${eur.format(value)}/${unit === "ml" ? "L" : "kg"}`;
}

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat("hr-HR", { day: "numeric", month: "numeric", year: "numeric" }).format(new Date(iso)) : null;

/** Croatian plural: 1 trgovina, 2 trgovine, 5 trgovina */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
