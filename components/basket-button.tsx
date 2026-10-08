"use client";

import Link from "next/link";
import { ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBasketCount } from "@/lib/basket/local-store";
import { hr } from "@/lib/i18n/hr";

export function BasketButton() {
  const count = useBasketCount();
  return (
    <Link
      href="/kosarica"
      aria-label={`${hr.nav.basket} (${count})`}
      className="relative inline-flex h-10 items-center gap-2 rounded-full bg-cocoa-900 pl-3 pr-3.5 text-sm font-medium text-oat-50 transition-colors hover:bg-cocoa-700"
    >
      <ShoppingBasket className="size-4" />
      <span className="hidden sm:inline">{hr.nav.basket}</span>
      <span
        className={cn(
          "tabular grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold transition-colors",
          count ? "bg-mint-300 text-mint-800" : "bg-cocoa-700 text-oat-300",
        )}
      >
        {count}
      </span>
    </Link>
  );
}
