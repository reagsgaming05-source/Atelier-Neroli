"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/*
 * Ce que le logiciel montre à l'écran : de vraies captures de l'application, prises par un script (npm run captures), sur un document d'exemple
 * fictif (« EXEMPLE » en filigrane, aucune donnée réelle : le dépôt est public). Rien n'est dessiné ni retouché.
 */
export const captures = [
  { key: "lire", label: "Lire", src: "/captures/lire.png", alt: "Aktum PDF, vue Lire : un règlement communal d'exemple, la liste des documents ouverts à gauche, « Traitement local : vos fichiers ne quittent pas cet ordinateur »." },
  { key: "organiser", label: "Organiser", src: "/captures/organiser.png", alt: "Aktum PDF, vue Organiser : les pages du document en vignettes, à déplacer, pivoter ou retirer." },
  { key: "dossier", label: "Dossier de pièces", src: "/captures/dossier.png", alt: "La boîte « Constituer un dossier de pièces » : titre, intercalaires, mention de pièce, pagination continue, sommaire et signets." },
  { key: "corriger", label: "Corriger le texte", src: "/captures/corriger.png", alt: "L'éditeur de page : un paragraphe du règlement d'exemple s'écrit directement sur la page, avec ses polices et sa mise en page." },
  { key: "tableau", label: "Tableau vers Excel", src: "/captures/tableau.png", alt: "La boîte « Copier un tableau vers Excel » : un tarif de déchets d'exemple, lu en douze lignes et trois colonnes, avec ses montants en nombres." },
  { key: "proteger", label: "Mot de passe", src: "/captures/proteger.png", alt: "La boîte « Protection par mot de passe » : mots de passe d'ouverture et de propriétaire, autorisations, chiffrement AES-256." },
] as const;

export type CaptureKey = (typeof captures)[number]["key"];

/** Une capture de l'application, avec sa légende : jamais une illustration. */
export function Capture({ k, className }: { k: CaptureKey; className?: string }) {
  const c = captures.find((x) => x.key === k) ?? captures[0];
  return (
    <figure className={cn("overflow-hidden rounded-2xl border border-line bg-white shadow-soft", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.src} alt={c.alt} width={1280} height={820} loading="lazy" className="block h-auto w-full" />
      <figcaption className="border-t border-line bg-canvas-100 px-4 py-2 text-xs text-ink-500">Capture de l&rsquo;application, sur un document d&rsquo;exemple fictif.</figcaption>
    </figure>
  );
}

/** Les captures, en onglets : elles défilent tant que la personne n'interagit pas. */
export function HeroShowcase() {
  const [courante, setCourante] = useState<CaptureKey>("lire");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      setCourante((s) => {
        const i = captures.findIndex((x) => x.key === s);
        return captures[(i + 1) % captures.length].key;
      });
    }, 6000);
    return () => clearInterval(t);
  }, [paused]);

  const c = captures.find((x) => x.key === courante) ?? captures[0];
  return (
    <div className="w-full" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div role="tablist" aria-label="Captures de l'application" className="mb-4 flex flex-wrap gap-2">
        {captures.map((s) => (
          <button
            key={s.key}
            role="tab"
            type="button"
            aria-selected={courante === s.key}
            onClick={() => {
              setCourante(s.key);
              setPaused(true);
            }}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
              courante === s.key ? "bg-brand-700 text-white shadow-card" : "bg-white text-ink-500 ring-1 ring-line hover:text-ink-900",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <figure className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft" role="tabpanel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.src} alt={c.alt} width={1280} height={820} className="block h-auto w-full" />
        <figcaption className="border-t border-line bg-canvas-100 px-4 py-2 text-xs text-ink-500">Capture de l&rsquo;application, sur un document d&rsquo;exemple fictif : aucune donnée réelle.</figcaption>
      </figure>
    </div>
  );
}
