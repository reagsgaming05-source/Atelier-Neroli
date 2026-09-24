"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, FileSignature, Inbox, LayoutDashboard, LogOut, Receipt, Repeat, User, Users } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/cn";

const icons = {
  dashboard: LayoutDashboard,
  subscription: CreditCard,
  invoices: Receipt,
  profile: User,
  members: Users,
  subscriptions: Repeat,
  messages: Inbox,
  quotes: FileSignature,
} as const;

export type SpaceNavItem = { href: string; label: string; icon: keyof typeof icons; exact?: boolean; badge?: number };

export function SpaceNav({ items }: { items: SpaceNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation de l'espace" className="card flex flex-col p-3">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {items.map((item) => {
          const Icon = icons[item.icon];
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
                  active ? "bg-brand-800 text-canvas-50" : "text-ink-700 hover:bg-canvas-100",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">{item.label}</span>
                {item.badge ? (
                  <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[0.65rem] font-bold", active ? "bg-canvas-50/20 text-canvas-50" : "bg-accent-100 text-accent-600")}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <form action={logoutAction} className="mt-2 border-t border-line pt-2">
        <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-500 transition hover:bg-canvas-100 hover:text-ink-900">
          <LogOut className="size-4" aria-hidden />
          Se déconnecter
        </button>
      </form>
    </nav>
  );
}
