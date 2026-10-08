import Link from "next/link";
import { cn } from "@/lib/utils";
import { hr } from "@/lib/i18n/hr";

/** Leaf mark: two soft petals forming a leaf, mint on mint. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("grid size-8 place-items-center rounded-[10px] bg-mint-600 text-oat-50 shadow-soft", className)}>
      <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" aria-hidden>
        <path
          d="M19.5 4.5C12 4.5 6 8.5 6 15c0 1.6.4 3 1 4.2C8.2 13.6 11.6 10.4 16 8.6c-3.6 2.4-6.4 5.6-7.6 10.4 1 .6 2.2 1 3.6 1 5.6 0 8.5-5 7.5-15.5Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)} aria-label="veganizir.ai početna">
      <LogoMark className="transition-transform group-hover:-rotate-6" />
      <span className="font-heading text-[1.35rem] font-semibold leading-none tracking-tight text-cocoa-900">
        {hr.brand.name}
        <span className="text-mint-500">{hr.brand.tld}</span>
      </span>
    </Link>
  );
}
