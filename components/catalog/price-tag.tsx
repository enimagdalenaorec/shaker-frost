import { cn } from "@/lib/utils";
import { formatPrice, formatUnitPrice } from "@/lib/format";

/**
 * Prices as hanging shelf tags with a punched hole, outlined in ink:
 * pistachio for regular prices, guava when the retailer has it on akcija.
 */
export function PriceTag({
  price,
  regularPrice,
  isAkcija,
  unitPrice,
  unit,
  size = "md",
  className,
}: {
  price: number;
  regularPrice?: number | null;
  isAkcija?: boolean;
  unitPrice?: number | null;
  unit?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const perUnit = formatUnitPrice(unitPrice, unit);
  const wasHigher = isAkcija && regularPrice != null && regularPrice > price;
  return (
    <div className={cn("flex flex-col items-end gap-0.5", className)}>
      <span
        className={cn(
          "tabular relative inline-flex items-center rounded-full border-[1.5px] border-ink font-heading font-black leading-none",
          isAkcija ? "bg-guava text-ink" : "bg-pistachio-pale text-ink",
          size === "sm" && "h-6 pl-[15px] pr-2 text-[13px]",
          size === "md" && "h-7 pl-[17px] pr-2.5 text-[15px]",
          size === "lg" && "h-9 pl-5 pr-3 text-xl",
        )}
      >
        <span aria-hidden className="absolute left-[6px] top-1/2 size-[5px] -translate-y-1/2 rounded-full border border-ink/60 bg-cream" />
        {formatPrice(price)}
      </span>
      {(wasHigher || perUnit) && (
        <span className="tabular text-[11px] font-semibold leading-none text-rind">
          {wasHigher ? <s className="decoration-ink/40">{formatPrice(regularPrice)}</s> : perUnit}
        </span>
      )}
    </div>
  );
}

export function DiscountBadge({ pct, className }: { pct: number; className?: string }) {
  if (!pct) return null;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center rounded-full border-[1.5px] border-ink bg-guava px-1.5 py-0.5 text-[11px] font-black leading-none text-ink",
        className,
      )}
    >
      −{pct}%
    </span>
  );
}
