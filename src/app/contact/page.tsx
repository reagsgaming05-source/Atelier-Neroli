import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Une question sur les tarifs, une démonstration, une offre pour votre équipe ou une demande de support : contactez Blonay PDF.",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const sujet = typeof params.sujet === "string" ? params.sujet : undefined;

  return (
    <section className="container-x grid gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-24">
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="mt-4 font-display text-[2.75rem] font-bold leading-[1.02] tracking-tight text-ink-900 sm:text-[3.5rem]">Parlons de vos documents.</h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-500">
          Démonstration, offre pour une équipe ou question technique : nous répondons sous 24 heures ouvrées, en français, allemand ou anglais.
        </p>

        <dl className="mt-10 space-y-6 text-[15px] text-ink-700">
          <div className="flex gap-4">
            <Mail className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
            <div>
              <dt className="font-semibold text-ink-900">E-mail</dt>
              <dd>
                <a href={`mailto:${site.email}`} className="hover:text-brand-700">
                  {site.email}
                </a>
                <span className="block text-ink-500">
                  Support :{" "}
                  <a href={`mailto:${site.supportEmail}`} className="hover:text-brand-700">
                    {site.supportEmail}
                  </a>
                </span>
              </dd>
            </div>
          </div>
          <div className="flex gap-4">
            <Phone className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
            <div>
              <dt className="font-semibold text-ink-900">Téléphone</dt>
              <dd>
                <a href={site.phoneHref} className="hover:text-brand-700">
                  {site.phone}
                </a>
              </dd>
            </div>
          </div>
          <div className="flex gap-4">
            <Clock className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
            <div className="flex-1">
              <dt className="font-semibold text-ink-900">Support</dt>
              <dd className="mt-1">
                <ul className="space-y-1">
                  {site.supportHours.map((h) => (
                    <li key={h.days} className="flex justify-between gap-6 sm:max-w-xs">
                      <span>{h.days}</span>
                      <span className="text-ink-900">{h.value}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </div>
          <div className="flex gap-4">
            <MapPin className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
            <div>
              <dt className="font-semibold text-ink-900">Siège</dt>
              <dd>
                {site.legalName}, {site.address.street}, {site.address.zip} {site.address.city} ({site.address.canton})
              </dd>
            </div>
          </div>
        </dl>
      </div>

      <ContactForm defaultSubject={sujet} />
    </section>
  );
}
