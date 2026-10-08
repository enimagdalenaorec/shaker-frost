import { cn } from "@/lib/utils";

export function Section({
  title,
  badge,
  action,
  children,
  className,
}: {
  title: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-9", className)}>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-cocoa-900">
          {title}
          {badge}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Horizontal, snap-scrolling strip that bleeds to the screen edge on mobile. */
export function Strip({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-none sm:-mx-6 sm:scroll-px-6 sm:px-6">
      {children}
    </div>
  );
}
