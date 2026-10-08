import { cn } from "@/lib/utils";
import { formatPrice, formatUnitPrice } from "@/lib/format";

/**
 * Prices look like the hanging shelf labels in a shop: a pointed tag with a punched hole.
 * Mint for regular prices, apricot when the retailer has it on akcija.
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
          "tabular relative inline-flex items-center font-heading font-bold leading-none tracking-tight",
          "[clip-path:polygon(9px_0,100%_0,100%_100%,9px_100%,0_50%)] rounded-r-[7px]",
          isAkcija ? "bg-apricot-500 text-white" : "bg-mint-100 text-mint-800",
          size === "sm" && "h-6 pl-[15px] pr-2 text-[13px]",
          size === "md" && "h-7 pl-[17px] pr-2.5 text-[15px]",
          size === "lg" && "h-9 pl-5 pr-3 text-xl",
        )}
      >
        <span aria-hidden className="absolute left-[7px] top-1/2 size-[5px] -translate-y-1/2 rounded-full bg-oat-50" />
        {formatPrice(price)}
      </span>
      {(wasHigher || perUnit) && (
        <span className="tabular text-[11px] leading-none text-cocoa-400">
          {wasHigher ? <s className="decoration-cocoa-300">{formatPrice(regularPrice)}</s> : perUnit}
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
        "tabular inline-flex items-center rounded-full bg-apricot-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white",
        className,
      )}
    >
      −{pct}%
    </span>
  );
}
