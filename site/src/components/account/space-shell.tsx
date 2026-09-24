import type { ReactNode } from "react";
import { SpaceNav, type SpaceNavItem } from "@/components/account/space-nav";

export function SpaceShell({ eyebrow, title, subtitle, items, children }: { eyebrow: string; title: string; subtitle?: string; items: SpaceNavItem[]; children: ReactNode }) {
  return (
    <div className="bg-canvas-100/60">
      <div className="container-x py-10 lg:py-14">
        <div className="mb-8">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold text-ink-900 sm:text-[2.75rem]">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-ink-500">{subtitle}</p>}
        </div>
        <div className="grid gap-6 lg:grid-cols-[250px_1fr] lg:gap-10">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <SpaceNav items={items} />
          </aside>
          <section className="min-w-0 space-y-6">{children}</section>
        </div>
      </div>
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
  flush = false,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Contenu bord à bord (tableaux) : le titre garde sa marge, le corps n'en a pas. */
  flush?: boolean;
}) {
  return (
    <div className={`card ${flush ? "pb-0" : "pb-6 sm:pb-8"} ${className ?? ""}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-5 sm:px-8 sm:pt-8">
          {title && <h2 className="font-display text-[1.5rem] font-semibold text-ink-900">{title}</h2>}
          {action}
        </div>
      )}
      <div className={flush ? "" : `px-6 sm:px-8 ${title || action ? "" : "pt-6 sm:pt-8"}`}>{children}</div>
    </div>
  );
}

export function Notice({ tone = "success", children }: { tone?: "success" | "error" | "info"; children: ReactNode }) {
  const styles = {
    success: "border-brand-200 bg-brand-50 text-brand-700",
    error: "border-danger/20 bg-danger/5 text-danger",
    info: "border-accent-200 bg-accent-100 text-accent-600",
  } as const;
  return (
    <div role="status" className={`rounded-2xl border px-5 py-4 text-sm ${styles[tone]}`}>
      {children}
    </div>
  );
}
