import { cn } from "@/lib/utils";
import { formatPrice, formatUnitPrice } from "@/lib/format";

/** Price in the team style: a heavy number, deep guava when on akcija, old price struck through. */
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
    <div className={cn("flex flex-col items-end leading-none", className)}>
      <span
        className={cn(
          "tabular font-heading font-black",
          isAkcija ? "text-guava-deep" : "text-ink",
          size === "sm" && "text-base",
          size === "md" && "text-xl",
          size === "lg" && "text-2xl",
        )}
      >
        {formatPrice(price)}
      </span>
      {(wasHigher || perUnit) && (
        <span className="tabular mt-1 text-[11px] font-bold text-rind">
          {wasHigher ? <s className="decoration-ink/50">{formatPrice(regularPrice)}</s> : perUnit}
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
        "tabular inline-flex items-center rounded-full border-[1.5px] border-ink bg-guava px-2 py-0.5 text-[12px] font-black leading-none text-ink",
        className,
      )}
    >
      −{pct}%
    </span>
  );
}
