import type { Metadata } from "next";
import { KeyRound, Lock, Monitor, Server, ShieldCheck, Trash2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { securityPoints, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Sécurité et hébergement",
  description: "Hébergement en Suisse, chiffrement, suppression automatique, conformité LPD et RGPD : comment Blonay PDF protège vos documents.",
};

const icons = { server: Server, lock: Lock, trash: Trash2, shield: ShieldCheck, key: KeyRound, monitor: Monitor } as const;

export default function SecuritePage() {
  return (
    <>
      <section className="container-x grid items-center gap-12 py-16 lg:grid-cols-2 lg:gap-20 lg:py-24">
        <div>
          <p className="eyebrow">Sécurité et hébergement</p>
          <h1 className="mt-4 font-display text-[2.75rem] font-bold leading-[1.02] tracking-tight text-ink-900 sm:text-[3.5rem]">Vos documents restent vos documents.</h1>
          <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-ink-500">
            <p>
              Un PDF contient souvent ce qu'une entreprise a de plus sensible : contrats, fiches de salaire, dossiers clients. Nous avons conçu {site.name} pour que ces fichiers ne quittent jamais la Suisse, et pour que vous gardiez le contrôle à chaque étape.
            </p>
            <p>
              Les fichiers traités en ligne sont chiffrés en transit et au repos, puis supprimés automatiquement. L'application de bureau va plus loin : elle traite vos documents localement, sans connexion.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/contact?sujet=Support%20technique" variant="secondary">
              Poser une question
            </ButtonLink>
            <ButtonLink href="/confidentialite" variant="ghost">
              Politique de confidentialité
            </ButtonLink>
          </div>
        </div>
        <div className="band-brand relative overflow-hidden rounded-[1.75rem] p-8 text-white shadow-soft sm:p-10">
          <p className="eyebrow text-accent-400">Trajet d'un fichier</p>
          <ol className="mt-6 space-y-5">
            {[
              { t: "Envoi", d: "Chiffré en TLS 1.3 depuis votre navigateur." },
              { t: "Traitement", d: "Sur des serveurs en Suisse, dans un espace isolé par client." },
              { t: "Stockage", d: "AES-256, clés gérées séparément des données." },
              { t: "Suppression", d: "Automatique après 24 h, ou immédiate sur demande." },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span className="font-display text-2xl font-semibold text-accent-400">0{i + 1}</span>
                <div>
                  <p className="font-semibold">{s.t}</p>
                  <p className="text-sm text-white/70">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-canvas-100">
        <div className="container-x py-20 lg:py-28">
          <SectionHeading eyebrow="Nos engagements" title="Six garanties, vérifiables." />
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {securityPoints.map((p) => {
              const Icon = icons[p.icon];
              return (
                <div key={p.title} className="card p-8">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 font-display text-[1.35rem] font-semibold text-ink-900">{p.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-500">{p.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-x py-20 lg:py-28">
        <div className="card flex flex-col items-start gap-6 p-8 sm:p-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-[2rem] font-semibold text-ink-900">Besoin d'un contrat de sous-traitance ?</h2>
            <p className="mt-2 text-ink-500">Les formules Équipe incluent un contrat de sous-traitance conforme à la LPD et au RGPD, et un contact dédié pour vos audits.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/contact?sujet=Offre%20pour%20une%20équipe" variant="secondary">
              Contacter l'équipe
            </ButtonLink>
            <ButtonLink href="/tarifs">Voir les formules</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
