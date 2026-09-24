import Link from "next/link";
import { cn } from "@/lib/cn";

/** Marque : une page au coin replié, avec la barre d'outils suggérée par trois traits. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-8", className)}>
      <path d="M9 4h15l9 9v20a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" fill="currentColor" />
      <path d="M24 4v6a3 3 0 0 0 3 3h6" fill="var(--color-accent-400)" />
      <path d="M12 21h16M12 26h16M12 31h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", light ? "text-white" : "text-brand-800", className)} aria-label="Blonay PDF — accueil">
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className="font-display text-[1.4rem] font-bold leading-none tracking-tight">
        Blonay <span className={light ? "text-accent-400" : "text-brand-600"}>PDF</span>
      </span>
    </Link>
  );
}
