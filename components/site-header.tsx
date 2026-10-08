import { Suspense } from "react";
import { MapPin } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { NavLinks } from "@/components/tab-bar";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-oat-100/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Logo />
        <Suspense fallback={<span className="hidden sm:block" />}>
          <NavLinks />
        </Suspense>
        <span className="inline-flex items-center gap-1 rounded-full bg-oat-200/80 px-2.5 py-1 text-xs font-semibold text-cocoa-700 sm:hidden">
          <MapPin className="size-3.5 text-mint-600" /> Zagreb
        </span>
      </div>
    </header>
  );
}
