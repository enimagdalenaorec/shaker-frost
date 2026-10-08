import { cn } from "@/lib/utils";

export function Section({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-14", className)}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-medium text-cocoa-900 sm:text-[1.65rem]">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-cocoa-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Horizontal, snap-scrolling strip that bleeds to the screen edge on mobile. */
export function Strip({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 scrollbar-none sm:-mx-6 sm:scroll-px-6 sm:px-6">
      {children}
    </div>
  );
}
