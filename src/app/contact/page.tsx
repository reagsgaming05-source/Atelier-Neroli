import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { ButtonLink } from "@/components/ui/button";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Réservez un soin ou posez-nous vos questions : adresse, horaires et formulaire de contact d'Atelier Néroli à Blonay.",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const sujet = typeof params.sujet === "string" ? params.sujet : undefined;
  const soin = typeof params.soin === "string" ? params.soin : undefined;
  const defaultMessage = soin ? `Bonjour,\n\nJe souhaite réserver : ${soin}.\nMes disponibilités : \n\nMerci.` : undefined;

  return (
    <section className="container-x grid gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-24">
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="mt-4 font-display text-5xl font-medium leading-[1.02] text-ink-900 sm:text-6xl">Parlons de votre prochain soin.</h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-500">
          Sur rendez-vous uniquement. Pour une réservation le jour même, préférez le téléphone pendant nos heures d'ouverture.
        </p>

        <dl className="mt-10 space-y-6 text-[15px] text-ink-700">
          <div className="flex gap-4">
            <MapPin className="mt-0.5 size-5 shrink-0 text-forest-600" aria-hidden />
            <div>
              <dt className="font-semibold text-ink-900">Adresse</dt>
              <dd>
                {site.address.street}, {site.address.zip} {site.address.city} ({site.address.canton})
              </dd>
            </div>
          </div>
          <div className="flex gap-4">
            <Phone className="mt-0.5 size-5 shrink-0 text-forest-600" aria-hidden />
            <div>
              <dt className="font-semibold text-ink-900">Téléphone</dt>
              <dd>
                <a href={site.phoneHref} className="hover:text-forest-700">
                  {site.phone}
                </a>
              </dd>
            </div>
          </div>
          <div className="flex gap-4">
            <Mail className="mt-0.5 size-5 shrink-0 text-forest-600" aria-hidden />
            <div>
              <dt className="font-semibold text-ink-900">E-mail</dt>
              <dd>
                <a href={`mailto:${site.email}`} className="hover:text-forest-700">
                  {site.email}
                </a>
              </dd>
            </div>
          </div>
          <div className="flex gap-4">
            <Clock className="mt-0.5 size-5 shrink-0 text-forest-600" aria-hidden />
            <div className="flex-1">
              <dt className="font-semibold text-ink-900">Horaires</dt>
              <dd className="mt-1">
                <ul className="space-y-1">
                  {site.hours.map((h) => (
                    <li key={h.days} className="flex justify-between gap-6 sm:max-w-xs">
                      <span>{h.days}</span>
                      <span className={h.value === "Fermé" ? "text-ink-400" : "text-ink-900"}>{h.value}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </div>
        </dl>

        <ButtonLink href={site.mapsUrl} variant="secondary" className="mt-10" target="_blank" rel="noreferrer">
          Ouvrir dans Google Maps
        </ButtonLink>
      </div>

      <ContactForm defaultSubject={sujet} defaultMessage={defaultMessage} />
    </section>
  );
}
