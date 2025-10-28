import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function GlassCard({
  title,
  description,
  action,
  footer,
  children,
  className,
}: GlassCardProps) {
  return (
    <section className={cn("glass-panel", className)}>
      {(title || description || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            {typeof title === "string" ? (
              <h2 className="text-lg font-semibold text-white">{title}</h2>
            ) : (
              title
            )}
            {description && (
              <p className="text-sm text-slate-300">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className="space-y-4">{children}</div>
      {footer && <footer className="mt-6 border-t border-white/10 pt-4 text-sm text-slate-300">{footer}</footer>}
    </section>
  );
}

export default GlassCard;
