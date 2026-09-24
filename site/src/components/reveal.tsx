import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Apparition douce à l'entrée dans la fenêtre, en CSS uniquement (animation liée au défilement).
 * Les navigateurs sans support, l'impression et les captures affichent le contenu tel quel.
 */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const style = delay ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties) : undefined;
  return (
    <div className={cn("reveal", className)} style={style}>
      {children}
    </div>
  );
}
