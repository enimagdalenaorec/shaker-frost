import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { NavLinks } from "@/components/tab-bar";
import { AuthButton } from "@/components/auth/auth-button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Suspense fallback={<span className="hidden sm:block" />}>
            <NavLinks />
          </Suspense>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
