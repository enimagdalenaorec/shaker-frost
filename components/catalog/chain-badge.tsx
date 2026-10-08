import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

// Chains' own logos (public/logos, from the team design), shown in small white badges.
const LOGOS: Record<string, string> = {
  konzum: "/logos/konzum.svg",
  spar: "/logos/spar.svg",
  lidl: "/logos/lidl.svg",
  kaufland: "/logos/kaufland.svg",
  plodine: "/logos/plodine.svg",
  dm: "/logos/dm.svg",
  biobio: "/logos/biobio.svg",
  tzh: "/logos/tvornica.png",
  studenac: "/logos/studenac.svg",
  zabac: "/logos/zabac.png",
};

// Fallback colours for chains without a logo file (and for coloured accents such as basket stripes).
const CHAIN_COLORS: Record<string, string> = {
  konzum: "#e0533c",
  lidl: "#2a5ea8",
  spar: "#3f8f55",
  kaufland: "#b8323a",
  plodine: "#e09a2a",
  dm: "#5b55a3",
  biobio: "#6f9d3c",
  tzh: "#8c6a3f",
  metro: "#22408a",
  tommy: "#d2452f",
  eurospin: "#1d4fa0",
};

export const chainColor = (code: string) => CHAIN_COLORS[code] ?? "var(--rind)";
export const chainLogo = (code: string) => LOGOS[code] ?? null;

export function ChainBadge({
  code,
  name,
  kind,
  className,
  size = "sm",
}: {
  code: string;
  name: string;
  kind?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const logo = LOGOS[code];
  if (logo) {
    return (
      <span className={cn("inline-flex shrink-0 items-center gap-1", className)} title={name}>
        <span
          className={cn(
            "blob blob-fill-white inline-flex items-center justify-center",
            size === "sm" ? "h-[22px] min-w-[46px] px-2" : "h-8 min-w-[68px] px-3",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={name} className={cn("w-auto object-contain", size === "sm" ? "max-h-[14px] max-w-[60px]" : "max-h-5 max-w-[84px]")} />
        </span>
        {kind === "webshop" && <Globe className="size-3 text-cocoa-400" aria-label="online" />}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-bold text-ink", size === "sm" ? "text-xs" : "text-sm", className)}>
      <span className={cn("shrink-0 rounded-full", size === "sm" ? "size-2" : "size-2.5")} style={{ background: chainColor(code) }} aria-hidden />
      {name}
      {kind === "webshop" && <Globe className="size-3 text-cocoa-400" aria-label="online" />}
    </span>
  );
}
