import type { Metadata } from "next";
import { Download, FileText, FolderOpen, MousePointerClick } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Télécharger",
  description:
    "Aktum PDF se télécharge sans compte : on décompresse, on double-clique. Aucune installation, aucun droit administrateur. Windows et macOS.",
};

export default function TelechargerPage() {
  return (
    <>
      <section className="border-b border-line bg-canvas-100">
        <div className="container-x py-16 lg:py-20">
          <p className="eyebrow">Télécharger</p>
          <h1 className="mt-4 max-w-3xl font-display text-[2.75rem] font-bold leading-[1.02] tracking-tight text-ink-900 sm:text-[3.5rem]">Essayez-le sur vos propres documents.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-500">
            Pour un logiciel portable, essayer et installer sont le même geste : on décompresse un dossier et on double-clique. Pas de compte à créer, pas de droit administrateur, rien dans le registre.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={site.downloads.windows} size="lg">
              <Download className="size-5" aria-hidden />
              Windows
            </ButtonLink>
            <ButtonLink href={site.downloads.mac} size="lg" variant="secondary">
              <Download className="size-5" aria-hidden />
              macOS
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="container-x py-16 lg:py-24">
        <SectionHeading eyebrow="En trois gestes" title="Du téléchargement au premier PDF." />
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: Download, t: "Télécharger le zip", d: "Un seul fichier. Il pèse une centaine de mégaoctets : le moteur d'affichage et la reconnaissance de texte sont inclus." },
            { icon: FolderOpen, t: "Décompresser", d: "Dans un dossier de votre choix : le Bureau, une clé USB, ou un lecteur réseau pour que toute l'équipe l'utilise." },
            { icon: MousePointerClick, t: "Double-cliquer", d: "AktumPDF.exe sous Windows, AktumPDF.app sous macOS. Au premier lancement, chacun crée son compte local." },
          ].map((s, i) => (
            <li key={s.t} className="card p-7">
              <span className="font-display text-3xl font-bold text-brand-200">0{i + 1}</span>
              <s.icon className="mt-3 size-5 text-brand-600" aria-hidden />
              <h3 className="mt-3 font-display text-lg font-semibold text-ink-900">{s.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-canvas-100">
        <div className="container-x grid gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <SectionHeading eyebrow="Dans le dossier" title="Ce que vous trouvez en le décompressant." />
            <ul className="mt-8 space-y-4 text-[15px] text-ink-700">
              {[
                ["Mode-d-emploi.pdf", "le mode d'emploi illustré"],
                ["LICENCE.txt", "les conditions d'utilisation"],
                ["MENTIONS-TIERCES.txt", "les licences des composants libres embarqués"],
                ["LISEZMOI-portable.txt / LISEZMOI-mac.txt", "le premier lancement, et ce qu'il faut savoir du dossier « data »"],
                ["Mettre-a-jour", "le script qui remplace le dossier par une version plus récente en gardant vos données"],
              ].map(([f, d]) => (
                <li key={f} className="flex gap-3">
                  <FileText className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
                  <span>
                    <span className="font-semibold text-ink-900">{f}</span> — {d}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-8">
            <h2 className="font-display text-[1.5rem] font-semibold text-ink-900">Ce qu&rsquo;il faut savoir avant</h2>
            <ul className="mt-5 space-y-3 text-[15px] leading-relaxed text-ink-500">
              <li>
                Cette version est <strong className="text-ink-900">à l&rsquo;essai</strong> : la signature de l&rsquo;exécutable n&rsquo;est pas encore en place. Windows peut afficher un avertissement au premier lancement (« Informations complémentaires », puis « Exécuter quand même »), et macOS demander un clic droit puis « Ouvrir ». Les fichiers LISEZMOI l&rsquo;expliquent pas à pas.
              </li>
              <li>Le logiciel ne produit pas de signature électronique qualifiée, ne produit pas de PDF/A et ne convertit pas depuis ou vers Word. La page Fonctionnalités dit, outil par outil, ce qui est fait et ce qui ne l&rsquo;est pas.</li>
              <li>Le logiciel n&rsquo;ouvre aucune connexion : vous pouvez le lancer réseau coupé pour le vérifier.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="container-x py-16 lg:py-24">
        <div className="card flex flex-col items-start gap-6 p-8 sm:p-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-[2rem] font-semibold text-ink-900">Pour toute une entité</h2>
            <p className="mt-2 text-ink-500">Une licence par entité, sur bon de commande, facture à 30 jours avec QR-facture.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/offre">Demander une offre</ButtonLink>
            <ButtonLink href="/tarifs" variant="secondary">
              Voir les formules
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
