import type { ReactNode } from "react";
import { SpaceNav, type SpaceNavItem } from "@/components/account/space-nav";

export function SpaceShell({ eyebrow, title, subtitle, items, children }: { eyebrow: string; title: string; subtitle?: string; items: SpaceNavItem[]; children: ReactNode }) {
  return (
    <div className="bg-cream-100/60">
      <div className="container-x py-10 lg:py-14">
        <div className="mb-8">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-2 font-display text-4xl font-medium text-ink-900 sm:text-5xl">{title}</h1>
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

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`card p-6 sm:p-8 ${className ?? ""}`}>
      {(title || action) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title && <h2 className="font-display text-2xl font-medium text-ink-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Notice({ tone = "success", children }: { tone?: "success" | "error" | "info"; children: ReactNode }) {
  const styles = {
    success: "border-forest-200 bg-forest-50 text-forest-700",
    error: "border-danger/20 bg-danger/5 text-danger",
    info: "border-blossom-200 bg-blossom-100 text-blossom-600",
  } as const;
  return (
    <div role="status" className={`rounded-2xl border px-5 py-4 text-sm ${styles[tone]}`}>
      {children}
    </div>
  );
}
