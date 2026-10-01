import type { Metadata } from "next";
import { FolderInput, HardDrive, KeyRound, Lock, Monitor, Server, WifiOff } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { securityPoints, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Sécurité et confidentialité",
  description:
    "Blonay PDF traite les documents sur le poste, sans connexion : rien n'est envoyé, rien n'est hébergé. Ce que cela garantit, ce que cela ne garantit pas, et comment le vérifier.",
};

const icons = { server: Server, lock: Lock, key: KeyRound, monitor: Monitor } as const;

export default function SecuritePage() {
  return (
    <>
      <section className="container-x grid items-center gap-12 py-16 lg:grid-cols-2 lg:gap-20 lg:py-24">
        <div>
          <p className="eyebrow">Sécurité et confidentialité</p>
          <h1 className="mt-4 font-display text-[2.75rem] font-bold leading-[1.02] tracking-tight text-ink-900 sm:text-[3.5rem]">Vos documents restent sur votre poste.</h1>
          <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-ink-500">
            <p>
              Un PDF d&rsquo;administration contient souvent des données sensibles : décisions, dossiers d&rsquo;enquête, certificats, dossiers d&rsquo;élèves. {site.name} a été conçu pour que ces fichiers ne quittent jamais le poste qui les traite.
            </p>
            <p>
              Il n&rsquo;y a pas de service en ligne : pas de téléversement, pas de stockage, pas d&rsquo;hébergement. Le logiciel lit, modifie et réécrit les fichiers sur votre poste ou votre lecteur réseau, et n&rsquo;ouvre aucune connexion pour le faire. Vous pouvez le vérifier vous-même, réseau coupé, en trente secondes.
            </p>
            <p>
              La conformité à la loi sur la protection des données reste celle de votre traitement. Ce logiciel a été conçu pour la faciliter ; il ne la certifie pas.
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
          <p className="eyebrow text-accent-400">Trajet d&rsquo;un fichier</p>
          <ol className="mt-6 space-y-5">
            {[
              { t: "Ouverture", d: "Le fichier est lu depuis votre disque ou votre lecteur réseau." },
              { t: "Traitement", d: "Dans la mémoire de votre poste, par le logiciel et nulle part ailleurs." },
              { t: "Écriture", d: "Le résultat est écrit sur votre disque. Rien n'est envoyé, rien n'est stocké ailleurs." },
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
          <SectionHeading eyebrow="Ce que nous affirmons" title="Quatre propriétés, vérifiables sur votre poste." />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
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
        <SectionHeading eyebrow="Vérifier" title="Ce que fera votre informaticien, et ce qu'il trouvera." />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: WifiOff, t: "Débrancher le réseau", d: "Lancer le logiciel, ouvrir un PDF, le modifier, l'enregistrer, reconnaître le texte d'un scan : tout fonctionne. C'est la démonstration la plus courte." },
            { icon: HardDrive, t: "Observer le trafic", d: "Lancer le logiciel derrière un pare-feu qui journalise : il n'émet aucune requête. Un test de la chaîne de construction le vérifie à chaque version." },
            { icon: FolderInput, t: "Lire le code", d: "Le code source est public. La page de l'application est chargée depuis le disque sous une politique de sécurité de contenu qui lui interdit toute connexion." },
          ].map((c) => (
            <div key={c.t} className="card p-7">
              <c.icon className="size-5 text-brand-600" aria-hidden />
              <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">{c.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-canvas-100">
        <div className="container-x py-16 lg:py-20">
          <h2 className="font-display text-[1.75rem] font-semibold text-ink-900">Ce qu&rsquo;il faut savoir aussi</h2>
          <ul className="mt-6 max-w-3xl space-y-3 text-[15px] leading-relaxed text-ink-500">
            <li>
              Le dossier de données du logiciel (documents récents, signatures mémorisées, copie de secours du travail en cours) est écrit en clair sur le poste : verrouillez votre session et ne mémorisez pas votre signature sur un poste partagé.
            </li>
            <li>Le caviardage retire le texte de la page ; il ne nettoie ni les métadonnées, ni les commentaires, ni les champs de formulaire. Relisez le fichier produit avant de le publier.</li>
            <li>Le logiciel ne produit pas de signature électronique au sens de la SCSE, ne vérifie pas les signatures numériques des PDF reçus, et ne produit pas de PDF/A.</li>
          </ul>
        </div>
      </section>

      <section className="container-x py-20 lg:py-28">
        <div className="card flex flex-col items-start gap-6 p-8 sm:p-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-[2rem] font-semibold text-ink-900">Une question de votre délégué à la protection des données ?</h2>
            <p className="mt-2 text-ink-500">Posez-la par écrit : nous répondons sur ce que le logiciel fait et ne fait pas, sans promettre une conformité qui est celle de votre traitement.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/contact?sujet=Support%20technique" variant="secondary">
              Nous écrire
            </ButtonLink>
            <ButtonLink href="/tarifs">Voir les formules</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
