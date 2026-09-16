import Link from "next/link";
import { Logo } from "@/components/logo";
import { navigation, site } from "@/content/site";

const legal = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgv", label: "Conditions générales" },
  { href: "/confidentialite", label: "Confidentialité" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-canvas-100 print:hidden">
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-5 text-[15px] leading-relaxed text-ink-500">{site.description}</p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">{site.platforms.join(" · ")}</p>
        </div>

        <div>
          <p className="eyebrow">Produit</p>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-ink-700 transition hover:text-brand-700">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="eyebrow">Espace client</p>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            <li>
              <Link href="/connexion" className="text-ink-700 transition hover:text-brand-700">
                Connexion
              </Link>
            </li>
            <li>
              <Link href="/inscription" className="text-ink-700 transition hover:text-brand-700">
                Créer un compte
              </Link>
            </li>
            <li>
              <Link href="/compte" className="text-ink-700 transition hover:text-brand-700">
                Mon abonnement
              </Link>
            </li>
            <li>
              <Link href="/compte/factures" className="text-ink-700 transition hover:text-brand-700">
                Mes factures
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="eyebrow">Entreprise</p>
          <address className="mt-4 space-y-2.5 text-[15px] not-italic text-ink-700">
            <p>
              {site.legalName}
              <br />
              {site.address.street}
              <br />
              {site.address.zip} {site.address.city}, {site.address.canton}
            </p>
            <p>
              <a href={`mailto:${site.email}`} className="transition hover:text-brand-700">
                {site.email}
              </a>
            </p>
            <p>
              <a href={site.linkedin} target="_blank" rel="noreferrer" className="transition hover:text-brand-700">
                LinkedIn
              </a>
            </p>
          </address>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.legalName} · {site.address.city}, Suisse
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {legal.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-brand-700">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
