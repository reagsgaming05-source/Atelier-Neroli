import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-8", className)}>
      <g fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.4">
        {[0, 72, 144, 216, 288].map((deg) => (
          <ellipse key={deg} cx="20" cy="11.5" rx="4.6" ry="8.5" transform={`rotate(${deg} 20 20)`} />
        ))}
      </g>
      <circle cx="20" cy="20" r="3" fill="currentColor" />
    </svg>
  );
}

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", light ? "text-cream-50" : "text-forest-800", className)} aria-label="Atelier Néroli — accueil">
      <LogoMark className="transition-transform duration-500 group-hover:rotate-[36deg]" />
      <span className="font-display text-[1.55rem] leading-none tracking-wide">
        Atelier <span className="font-semibold">Néroli</span>
      </span>
    </Link>
  );
}
