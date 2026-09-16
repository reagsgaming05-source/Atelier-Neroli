import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="container-x flex flex-col items-center py-24 text-center lg:py-32">
      <p className="eyebrow">Erreur 404</p>
      <h1 className="mt-4 font-display text-[2.75rem] font-bold tracking-tight text-ink-900 sm:text-[3.5rem]">Cette page n'existe pas.</h1>
      <p className="mt-4 max-w-md text-[15px] text-ink-500">Le lien est peut-être erroné ou la page a été déplacée. Retournez à l'accueil ou découvrez les fonctionnalités.</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/">Retour à l'accueil</ButtonLink>
        <ButtonLink href="/fonctionnalites" variant="secondary">
          Fonctionnalités
        </ButtonLink>
      </div>
    </section>
  );
}
