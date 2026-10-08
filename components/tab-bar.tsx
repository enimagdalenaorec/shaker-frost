"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Search, ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBasketCount } from "@/lib/basket/local-store";
import { hr } from "@/lib/i18n/hr";

const TABS = [
  { href: "/", label: hr.nav.home, Icon: Home, match: (p: string) => p === "/" || (p.startsWith("/recept") && !p.startsWith("/recepti")) },
  { href: "/trazi", label: hr.nav.search, Icon: Search, match: (p: string) => p.startsWith("/trazi") },
  { href: "/recepti", label: hr.nav.myRecipes, Icon: BookOpen, match: (p: string) => p.startsWith("/recepti") },
  { href: "/kosarica", label: hr.nav.basket, Icon: ShoppingBasket, match: (p: string) => p.startsWith("/kosarica") },
] as const;

function CountDot({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "tabular grid min-w-[18px] place-items-center rounded-full border-[1.5px] border-ink bg-guava px-1 text-[10px] font-black leading-[15px] text-ink",
        className,
      )}
    >
      {count}
    </span>
  );
}

/** Mobile: fixed bottom tab bar, like a real grocery app. */
export function TabBar() {
  const path = usePathname();
  const count = useBasketCount();
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 sm:hidden" aria-label="Glavna navigacija">
      <ul className="grid grid-cols-4 rounded-[24px] border-2 border-ink bg-ink p-1.5 shadow-[0_6px_0_rgb(64_52_66/0.25)]">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "relative flex h-12 items-center justify-center gap-1.5 rounded-[18px] text-[13px] font-black transition-colors",
                  active ? "bg-pistachio text-ink" : "text-cream/70 hover:text-cream",
                )}
              >
                <span className="relative">
                  <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                  {href === "/kosarica" && <CountDot count={count} className="absolute -right-2.5 -top-2" />}
                </span>
                {active && label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Desktop: the same destinations in the header. */
export function NavLinks() {
  const path = usePathname();
  const count = useBasketCount();
  return (
    <nav className="hidden items-center gap-1 sm:flex" aria-label="Glavna navigacija">
      {TABS.map(({ href, label, Icon, match }) => {
        const active = match(path);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-extrabold text-ink transition-colors",
              active ? "bg-pistachio" : "hover:bg-ink/[0.07]",
            )}
          >
            <Icon className="size-4" />
            {label}
            {href === "/kosarica" && <CountDot count={count} />}
          </Link>
        );
      })}
    </nav>
  );
}
