import Link from "next/link";
import { ArrowRight, Globe, Monitor, PlayCircle, Quote, ServerCog, ShieldCheck } from "lucide-react";
import { ComparisonTable } from "@/components/comparison-table";
import { Faq } from "@/components/faq";
import { FeatureCard } from "@/components/feature-card";
import { HeroShowcase } from "@/components/hero-showcase";
import { PricingTable } from "@/components/pricing-table";
import { Reveal } from "@/components/reveal";
import { FormsVisual, RedactVisual, SignatureVisual, Spotlight } from "@/components/spotlights";
import { DeploymentTimeline } from "@/components/timeline";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { faq, features, institutionTypes, site, stats, testimonials, values } from "@/content/site";
import { segments } from "@/content/segments";
import { getAccess } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { listActivePlans } from "@/lib/subscriptions";

const highlights = [
  { icon: ServerCog, text: "Données des élèves hébergées en Suisse" },
  { icon: ShieldCheck, text: "Conforme LPD et LPrD vaudoise" },
  { icon: Globe, text: "Web, Windows et macOS" },
  { icon: Monitor, text: "Connexion unique via l'identité cantonale" },
];

export default async function HomePage() {
  const [plans, user] = await Promise.all([listActivePlans(), getCurrentUser()]);
  const access = user ? await getAccess(user) : null;
  const hasSubscription = Boolean(access && access.kind !== "none");
  const featured = features.filter((f) => f.featured);

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="hero-bg relative overflow-hidden">
        <div className="container-x grid items-center gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-24">
          <div>
            <p className="eyebrow">Communes · Écoles · Services de l&rsquo;État</p>
            <h1 className="mt-5 font-display text-[2.9rem] font-bold leading-[1.02] tracking-tight text-ink-900 sm:text-[3.6rem] lg:text-[4.1rem]">
              Les documents officiels, <span className="text-brand-700">sans licence Acrobat.</span>
            </h1>
            <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-ink-500 sm:text-lg">{site.description}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/offre" size="lg">
                Demander une offre
                <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/demo" variant="secondary" size="lg">
                <PlayCircle className="size-4" aria-hidden />
                Essayer la démo
              </ButtonLink>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-8">
              {stats.map((s) => (
                <div key={s.v}>
                  <dt className="font-display text-3xl font-semibold text-ink-900">{s.k}</dt>
                  <dd className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-500">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <HeroShowcase />
        </div>
      </section>

      {/* ---------- Trois publics, trois chemins ---------- */}
      <section className="border-y border-line bg-white py-14 lg:py-16">
        <div className="container-x">
          <h2 className="font-display text-2xl font-semibold text-ink-900">Vous êtes&nbsp;?</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {segments.map((s) => (
              <Link
                key={s.slug}
                href={`/${s.slug}`}
                className="group card flex h-full flex-col p-7 transition hover:border-brand-200 hover:shadow-soft"
              >
                <p className="font-display text-xl font-semibold text-ink-900">{s.label}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-ink-400">{s.units.slice(0, 3).join(" · ")}</p>
                <p className="mt-4 flex-1 text-[15px] leading-relaxed text-ink-500">{s.lede.split(". ")[0]}.</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 group-hover:text-brand-900">
                  Voir la page {s.label.toLowerCase()}
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Types d'institutions ---------- */}
      <section className="border-y border-line bg-white">
        <div className="container-x flex flex-col items-center gap-4 py-6 lg:flex-row lg:justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">Pensé pour</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {institutionTypes.map((t) => (
              <li key={t} className="rounded-full bg-canvas-100 px-3.5 py-1.5 text-sm font-medium text-ink-700">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Points clés ---------- */}
      <section className="bg-canvas-100">
        <ul className="container-x grid gap-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((h) => (
            <li key={h.text} className="flex items-center gap-3 text-sm text-ink-700">
              <h.icon className="size-4 shrink-0 text-brand-600" aria-hidden />
              {h.text}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Fonctionnalités ---------- */}
      <section className="container-x py-20 lg:py-28">
        <Reveal>
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <SectionHeading eyebrow="Fonctionnalités" title="Douze outils, une seule interface." text="Bulletins, convocations, formulaires, dossiers d'élèves : les opérations du quotidien d'un secrétariat ou d'une salle des maîtres, sans changer d'application." />
            <Link href="/fonctionnalites" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900">
              Toutes les fonctionnalités
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {featured.map((feature, i) => (
            <Reveal key={feature.slug} delay={i * 80}>
              <FeatureCard feature={feature} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- En situation ---------- */}
      <section className="bg-canvas-100">
        <div className="container-x space-y-24 py-20 lg:py-28">
          <Reveal>
            <SectionHeading align="center" eyebrow="En situation" title="Trois journées types, du secrétariat à la salle des maîtres." />
          </Reveal>
          <Reveal>
            <Spotlight
              eyebrow="Signature des parents"
              title="Une autorisation de camp signée en une journée, pas en deux semaines."
              text="Le secrétariat envoie l'autorisation aux parents, suit qui a signé, relance automatiquement les retardataires et archive le certificat d'audit avec le document."
              points={["Envoi groupé à toute une classe", "Rappels automatiques et suivi en temps réel", "Signature depuis un téléphone, sans compte pour les parents"]}
              href="/fonctionnalites#signer"
              cta="La signature électronique"
              visual={<SignatureVisual />}
            />
          </Reveal>
          <Reveal>
            <Spotlight
              reverse
              eyebrow="Protection des données"
              title="Transmettre un dossier d'élève sans exposer ce qui ne doit pas l'être."
              text="Avant d'envoyer un dossier à un service externe, le caviardage supprime réellement les données personnelles du fichier, avec un rapport de vérification pour la direction."
              points={["Recherche par motif : numéro AVS, adresse, e-mail", "Suppression irréversible, métadonnées nettoyées", "Conforme aux exigences de la LPrD"]}
              href="/fonctionnalites#caviarder"
              cta="Le caviardage"
              visual={<RedactVisual />}
            />
          </Reveal>
          <Reveal>
            <Spotlight
              eyebrow="Formulaires"
              title="Les inscriptions au camp reviennent déjà classées dans un tableau."
              text="Un formulaire PDF à remplir remplace les photocopies : les parents répondent en ligne, le secrétariat exporte les réponses et relance les retardataires en un clic."
              points={["Champs détectés automatiquement", "Réponses centralisées, export en tableau", "Compatible avec les formulaires existants"]}
              href="/fonctionnalites#formulaires"
              cta="Les formulaires"
              visual={<FormsVisual />}
            />
          </Reveal>
        </div>
      </section>

      {/* ---------- Démo ---------- */}
      <section className="container-x py-20 lg:py-28">
        <Reveal>
          <div className="band-brand grid gap-8 rounded-[1.75rem] p-8 text-white sm:p-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="eyebrow text-accent-400">Démo interactive</p>
              <h2 className="mt-3 font-display text-[2.25rem] font-semibold leading-tight sm:text-[2.6rem]">Essayez maintenant, avec vos propres PDF.</h2>
              <p className="mt-4 max-w-xl text-[17px] text-white/75">
                Fusion, réorganisation, extraction, filigrane et numérotation, directement dans votre navigateur. Aucun compte, aucun envoi de fichier.
              </p>
              <ButtonLink href="/demo" variant="light" className="mt-8">
                <PlayCircle className="size-4" aria-hidden />
                Ouvrir la démo
              </ButtonLink>
            </div>
            <div className="rounded-2xl border-2 border-dashed border-white/30 p-8 text-center">
              <p className="font-display text-xl font-semibold">Déposez un PDF ici</p>
              <p className="mt-1 text-sm text-white/60">ou chargez le document d'exemple</p>
              <div className="mx-auto mt-5 flex w-fit gap-2">
                {[1, 2, 3].map((n) => (
                  <span key={n} className="h-14 w-11 rounded-md bg-white/90 shadow-card" />
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- Pourquoi ---------- */}
      <section className="bg-canvas-100">
        <div className="container-x grid items-center gap-12 py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
          <Reveal>
            <div className="band-brand relative overflow-hidden rounded-[1.75rem] p-10 text-white sm:p-14">
              <p className="eyebrow text-accent-400">Notre conviction</p>
              <p className="mt-4 font-display text-[1.9rem] font-semibold leading-snug sm:text-[2.3rem]">
                « Un outil PDF pour l'école doit être complet, simple pour tout le monde, et garder les données des élèves là où elles doivent rester : en Suisse. »
              </p>
              <p className="mt-6 text-xs uppercase tracking-[0.16em] text-white/60">L'équipe {site.name}, {site.address.city}</p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <SectionHeading eyebrow="Pourquoi Blonay PDF" title="Pensé pour l'école vaudoise." text="Écoles obligatoires, gymnases, écoles professionnelles et services de l'État : des utilisateurs pour qui la protection des données et la simplicité ne sont pas négociables." />
            <ul className="mt-10 space-y-6">
              {values.map((v) => (
                <li key={v.title} className="flex gap-5">
                  <span className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <ShieldCheck className="size-4" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink-900">{v.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{v.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <ButtonLink href="/securite" variant="secondary" className="mt-10">
              Sécurité et hébergement
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      {/* ---------- Tarifs ---------- */}
      <section id="tarifs" className="container-x py-20 lg:py-28">
        <Reveal>
          <SectionHeading align="center" eyebrow="Tarifs" title="Une formule par personne, par établissement ou pour le canton." text="Mensuel ou annuel, sans engagement au-delà de la période en cours. Les établissements règlent sur bon de commande ; le déploiement cantonal se fait sur devis." />
        </Reveal>
        <div className="mt-12">
          <PricingTable plans={plans} hasSubscription={hasSubscription} />
        </div>
        <p className="mt-8 text-center text-xs text-ink-400">{site.vatNote} Résiliation possible à tout moment depuis votre espace client.</p>
      </section>

      {/* ---------- Comparatif ---------- */}
      <section className="bg-canvas-100">
        <div className="container-x py-20 lg:py-28">
          <Reveal>
            <SectionHeading eyebrow="Comparatif" title="Face à Acrobat et aux outils gratuits." text="Ce qui change pour un établissement public : l'hébergement, la conformité, le modèle de licence et le support." />
          </Reveal>
          <Reveal delay={100} className="mt-12">
            <ComparisonTable />
          </Reveal>
        </div>
      </section>

      {/* ---------- Déploiement ---------- */}
      <section className="band-brand text-white">
        <div className="container-x py-20 lg:py-28">
          <Reveal>
            <SectionHeading light eyebrow="Déploiement" title="Un établissement équipé en quatre semaines." text="Un accompagnement rodé, de la convention à l'ouverture au corps enseignant." />
          </Reveal>
          <div className="mt-14">
            <DeploymentTimeline />
          </div>
        </div>
      </section>

      {/* ---------- Témoignages ---------- */}
      <section className="container-x py-20 lg:py-28">
        <Reveal>
          <SectionHeading align="center" eyebrow="Dans les écoles" title="Ce que les établissements retiennent." />
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.quote} delay={i * 80}>
              <figure className="card flex h-full flex-col p-8">
                <Quote className="size-5 text-accent-500" aria-hidden />
                <blockquote className="mt-4 flex-1 text-[17px] leading-relaxed text-ink-900">{t.quote}</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-4 text-sm">
                  <span className="flex size-9 items-center justify-center rounded-full bg-brand-900 font-display text-sm font-semibold text-white">{t.author[0]}</span>
                  <span>
                    <span className="block font-semibold text-ink-900">{t.author}</span>
                    <span className="block text-ink-500">{t.detail}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="bg-canvas-100">
        <div className="container-x grid gap-12 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
          <SectionHeading eyebrow="Questions fréquentes" title="Tout ce qu'il faut savoir avant de commencer." text="Une autre question ? Écrivez-nous, nous répondons sous 24 h ouvrées." />
          <Faq items={faq} />
        </div>
      </section>

      {/* ---------- Appel final ---------- */}
      <section className="container-x py-20 lg:py-28">
        <div className="card grid gap-10 p-8 sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="eyebrow">Prêt à commencer ?</p>
            <h2 className="mt-3 font-display text-[2.25rem] font-semibold leading-tight text-ink-900">Équipez votre établissement en une semaine.</h2>
            <p className="mt-3 max-w-xl text-[15px] text-ink-500">
              Souscrivez en ligne ou demandez une démonstration pour votre équipe. Les applications Windows et macOS se téléchargent depuis l'espace client, et la version web est immédiate.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <ButtonLink href="/tarifs">Souscrire pour un établissement</ButtonLink>
            <ButtonLink href="/contact?sujet=Demande%20de%20démonstration" variant="secondary">
              Demander une démo
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
