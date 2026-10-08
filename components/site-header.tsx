import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { BasketButton } from "@/components/basket-button";
import { hr } from "@/lib/i18n/hr";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-oat-100/80 backdrop-blur-md supports-[backdrop-filter]:bg-oat-100/70">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1.5">
          <Link
            href="/trazi"
            className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-cocoa-700 transition-colors hover:bg-oat-200/70"
          >
            <Search className="size-4" />
            <span className="hidden sm:inline">{hr.nav.search}</span>
          </Link>
          <BasketButton />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border/60">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-8 text-xs text-cocoa-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>{hr.footer.prices("6. 10. 2026.")}</p>
        <p>{hr.footer.sources}</p>
      </div>
    </footer>
  );
}
