import type { Metadata } from "next";
import Link from "next/link";
import { Lock, MonitorSmartphone, Sparkles } from "lucide-react";
import { PdfWorkbench } from "@/components/pdf-workbench";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Démo interactive",
  description: "Essayez Blonay PDF sans compte : fusionnez, réorganisez, extrayez, filigranez et numérotez vos PDF directement dans le navigateur.",
};

export default async function DemoPage() {
  const user = await getCurrentUser();

  return (
    <>
      <section className="hero-bg border-b border-line">
        <div className="container-x py-14 lg:py-18">
          <div className="max-w-3xl">
            <p className="eyebrow">Démo interactive</p>
            <h1 className="mt-4 font-display text-[2.75rem] font-bold leading-[1.02] tracking-tight text-ink-900 sm:text-[3.5rem]">Essayez, sans compte, sans envoi de fichier.</h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-500">
              Un aperçu fonctionnel de cinq outils : fusion, réorganisation des pages, extraction, filigrane et numérotation. Vos documents restent dans votre navigateur.
            </p>
          </div>
          <ul className="mt-8 grid gap-4 text-sm text-ink-700 sm:grid-cols-3">
            {[
              { icon: Lock, text: "Traitement local : rien ne quitte votre appareil" },
              { icon: MonitorSmartphone, text: "Fonctionne sur ordinateur et tablette" },
              { icon: Sparkles, text: "Un document d'exemple est fourni" },
            ].map((h) => (
              <li key={h.text} className="flex items-center gap-2.5">
                <h.icon className="size-4 shrink-0 text-brand-600" aria-hidden />
                {h.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-x py-12 lg:py-16">
        <PdfWorkbench isLoggedIn={Boolean(user)} />
        {user ? (
          <p className="mt-4 text-xs text-ink-400">
            Connecté·e : les opérations effectuées ici s'ajoutent à vos{" "}
            <Link href="/compte" className="font-semibold text-brand-700 hover:text-brand-900">
              statistiques d'usage
            </Link>
            .
          </p>
        ) : null}
      </section>

      <section className="container-x pb-20">
        <div className="band-brand grid gap-8 rounded-[1.75rem] p-8 text-white sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="eyebrow text-accent-400">Et dans la version complète</p>
            <h2 className="mt-3 font-display text-[2rem] font-semibold leading-tight">Signature, OCR, caviardage, conversion, formulaires…</h2>
            <p className="mt-3 max-w-xl text-[15px] text-white/75">
              La démo montre les opérations réalisables hors ligne. Les douze outils, l'espace documentaire de l'établissement et la connexion cantonale sont dans les formules.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <ButtonLink href="/tarifs" variant="light">
              Voir les formules
            </ButtonLink>
            <ButtonLink href="/fonctionnalites" variant="outlineLight">
              Les douze outils
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
