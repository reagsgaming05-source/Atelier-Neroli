import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * La marque : la même que dans l'application et que l'icône (outils/src/marque.svg) — une feuille au coin replié, un signet
 * posé dessus, sur une tuile rouge. Ses couleurs ne suivent pas le thème ; outils/test/marque.test.js vérifie que le dessin
 * est celui du fichier source.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 26 26" aria-hidden className={cn("size-8", className)}>
      <rect width="26" height="26" rx="7" fill="var(--color-signet)" />
      <path d="M7.2 4.4h7l4.6 4.6v13H7.2z" fill="var(--color-papier)" />
      <path d="M14.2 4.4v4.6h4.6z" fill="var(--color-signet-pli)" />
      <path d="M9.4 4.4h3.6v9.6l-1.8-1.7-1.8 1.7z" fill="var(--color-signet-fonce)" />
      <path d="M9.4 16.8h7M9.4 19.2h4.4" stroke="var(--color-signet-fonce)" strokeWidth="1.45" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", light ? "text-white" : "text-ink-900", className)} aria-label="Aktum PDF — accueil">
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className="font-display text-[1.7rem] leading-none tracking-tight">
        Aktum <span className={light ? "text-brand-200" : "text-ink-700"}>PDF</span>
      </span>
    </Link>
  );
}
