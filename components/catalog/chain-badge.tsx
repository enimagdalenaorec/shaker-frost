import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

// Recognisable but muted chain colours (a small dot, never a big block of brand colour).
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

export const chainColor = (code: string) => CHAIN_COLORS[code] ?? "var(--cocoa-400)";

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
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium text-cocoa-700",
        size === "sm" ? "text-xs" : "text-sm",
        className,
      )}
    >
      <span
        className={cn("shrink-0 rounded-full", size === "sm" ? "size-2" : "size-2.5")}
        style={{ background: chainColor(code) }}
        aria-hidden
      />
      {name}
      {kind === "webshop" && <Globe className="size-3 text-cocoa-400" aria-label="online" />}
    </span>
  );
}
