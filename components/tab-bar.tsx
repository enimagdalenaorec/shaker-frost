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
        "tabular grid min-w-[18px] place-items-center rounded-full bg-apricot-500 px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-oat-50",
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
      <ul className="grid grid-cols-4 rounded-[22px] bg-cocoa-900 p-1.5 shadow-lift">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "relative flex h-12 items-center justify-center gap-2 rounded-2xl text-[13px] font-semibold transition-colors",
                  active ? "bg-oat-50 text-cocoa-900" : "text-oat-300 hover:text-oat-50",
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
              "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
              active ? "bg-cocoa-900 text-oat-50" : "text-cocoa-700 hover:bg-oat-200",
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
