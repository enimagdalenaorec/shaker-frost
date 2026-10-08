import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The two-leaf logo mark (team identity). */
export function LogoMark({ className }: { className?: string }) {
  return <Image src="/logo-mark.png" alt="" width={231} height={256} priority className={cn("h-8 w-auto", className)} aria-hidden />;
}

/** veganizir.ai wordmark: logo mark + "veganizir" in ink, ".ai" in deep guava. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2", className)} aria-label="veganizir.ai početna">
      <LogoMark className="h-8 -rotate-[4deg] transition-transform group-hover:rotate-[4deg] group-hover:scale-105" />
      <span className="font-heading text-[1.45rem] font-black leading-none text-ink">
        veganizir<span className="text-guava-deep">.ai</span>
      </span>
    </Link>
  );
}
