"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { navigation } from "@/content/site";
import { cn } from "@/lib/cn";

type HeaderUser = { firstName: string; role: "member" | "admin" } | null;

export function SiteHeader({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const spaceHref = user?.role === "admin" ? "/admin" : "/compte";
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas-50/85 backdrop-blur-md print:hidden">
      <div className="container-x flex h-[72px] items-center justify-between gap-6">
        <Logo />

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Navigation principale">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-[15px] font-medium transition hover:text-brand-700",
                isActive(item.href) ? "text-brand-800" : "text-ink-700",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          {user ? (
            <Link href={spaceHref} className="text-[15px] font-medium text-ink-700 transition hover:text-brand-700">
              Bonjour {user.firstName}
            </Link>
          ) : (
            <Link href="/connexion" className="text-[15px] font-medium text-ink-700 transition hover:text-brand-700">
              Connexion
            </Link>
          )}
          <ButtonLink href={user ? spaceHref : "/tarifs"} size="sm">
            {user ? "Mon espace" : "Commencer"}
          </ButtonLink>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className="inline-flex size-11 items-center justify-center rounded-full text-ink-900 transition hover:bg-canvas-200 lg:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-canvas-50 lg:hidden">
          <nav className="container-x flex flex-col py-4" aria-label="Navigation mobile">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-xl px-3 py-3 text-base font-medium transition hover:bg-canvas-200",
                  isActive(item.href) ? "text-brand-800" : "text-ink-700",
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-3 border-t border-line pt-4">
              {user ? (
                <ButtonLink href={spaceHref}>Mon espace</ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/tarifs">Commencer</ButtonLink>
                  <ButtonLink href="/connexion" variant="secondary">
                    Connexion
                  </ButtonLink>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
