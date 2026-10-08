import { cn } from "@/lib/utils";

/** Section with a Grandstander title and the guava underline bar (team style). */
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
    <section className={cn("mt-12", className)}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="title-bar flex flex-col text-[1.9rem] leading-none text-ink sm:text-4xl">
          <span className="flex items-center gap-2">
            {title}
            {badge}
          </span>
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
    <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1 scrollbar-none sm:-mx-6 sm:scroll-px-6 sm:px-6">
      {children}
    </div>
  );
}
