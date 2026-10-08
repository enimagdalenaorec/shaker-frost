import { Croissant, Droplet, EggOff, Leaf, Milk, ShoppingBasket, Sprout, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";

// No product photos yet: a calm tinted tile with a category icon.
function pick(group: string | null, name: string) {
  const n = name.toLowerCase();
  if (/kruh|pecivo|baget/.test(n)) return { Icon: Croissant, tone: "bg-oat-200 text-cocoa-500" };
  switch (group) {
    case "biljne alternative mlijeku":
      return { Icon: Milk, tone: "bg-mint-100 text-mint-700" };
    case "biljne alternative mesu":
      return { Icon: Sprout, tone: "bg-apricot-50 text-apricot-700" };
    case "zamjene za jaja i vezivo":
      return { Icon: EggOff, tone: "bg-honey-100 text-honey-700" };
    case "ulja":
      return { Icon: Droplet, tone: "bg-honey-100 text-honey-700" };
    case "brašno, žitarice i tjestenina":
      return { Icon: Wheat, tone: "bg-oat-200 text-cocoa-500" };
    case "ostale biljne zamjene":
      return { Icon: Leaf, tone: "bg-mint-50 text-mint-600" };
    default:
      return { Icon: ShoppingBasket, tone: "bg-oat-200 text-cocoa-400" };
  }
}

export function ProductIcon({
  group,
  name,
  className,
  iconClassName,
}: {
  group: string | null;
  name: string;
  className?: string;
  iconClassName?: string;
}) {
  const { Icon, tone } = pick(group, name);
  return (
    <div className={cn("grid shrink-0 place-items-center rounded-xl", tone, className)}>
      <Icon className={cn("size-6 stroke-[1.5]", iconClassName)} aria-hidden />
    </div>
  );
}
