import { cn } from "@/lib/utils";
import { formatPrice, formatUnitPrice } from "@/lib/format";

export function PriceTag({
  price,
  regularPrice,
  isAkcija,
  unitPrice,
  unit,
  align = "left",
  size = "md",
}: {
  price: number;
  regularPrice?: number | null;
  isAkcija?: boolean;
  unitPrice?: number | null;
  unit?: string | null;
  align?: "left" | "right";
  size?: "sm" | "md" | "lg";
}) {
  const perUnit = formatUnitPrice(unitPrice, unit);
  return (
    <div className={cn("flex flex-col leading-tight", align === "right" ? "items-end text-right" : "items-start")}>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "tabular font-semibold tracking-tight",
            isAkcija ? "text-apricot-700" : "text-cocoa-900",
            size === "sm" && "text-sm",
            size === "md" && "text-base",
            size === "lg" && "text-xl",
          )}
        >
          {formatPrice(price)}
        </span>
        {isAkcija && regularPrice != null && regularPrice > price && (
          <span className="tabular text-xs text-cocoa-400 line-through decoration-cocoa-300">{formatPrice(regularPrice)}</span>
        )}
      </div>
      {perUnit && <span className="tabular text-[11px] text-cocoa-400">{perUnit}</span>}
    </div>
  );
}

export function DiscountBadge({ pct, className }: { pct: number; className?: string }) {
  if (!pct) return null;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center rounded-full bg-apricot-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-soft",
        className,
      )}
    >
      −{pct} %
    </span>
  );
}
