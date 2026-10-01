/**
 * Qui vend le logiciel.
 *
 * Le dépôt est public : aucune raison sociale, aucune adresse, aucun numéro
 * d'identification, aucun IBAN n'y figure. Tout vient de l'environnement de
 * l'hébergeur (voir .env.example), et tant qu'une valeur manque, le site ne
 * l'invente pas : il n'affiche que ce qui existe, et refuse d'émettre une offre
 * ou une facture. Une facture au nom d'une entité qui n'existe pas est un acte
 * juridique, pas un texte provisoire.
 */

const lire = (cle: string) => (process.env[cle] ?? "").trim();

export const editeur = {
  /** Raison sociale, ou nom de l'exploitant s'il s'agit d'une entreprise individuelle. */
  nom: lire("EDITEUR_NOM"),
  rue: lire("EDITEUR_RUE"),
  numero: lire("EDITEUR_NUMERO"),
  npa: lire("EDITEUR_NPA"),
  localite: lire("EDITEUR_LOCALITE"),
  canton: lire("EDITEUR_CANTON"),
  telephone: lire("EDITEUR_TELEPHONE"),
  email: lire("EDITEUR_EMAIL"),
  emailSupport: lire("EDITEUR_EMAIL_SUPPORT") || lire("EDITEUR_EMAIL"),
  /** Numéro d'identification des entreprises (IDE), « CHE-123.456.789 ». */
  ide: lire("EDITEUR_IDE"),
  /** Numéro de TVA : à poser seulement une fois l'entreprise assujettie. */
  tva: lire("EDITEUR_TVA"),
  iban: lire("EDITEUR_IBAN"),
};

/** De quoi écrire une adresse postale complète. */
export const adresseConnue = Boolean(editeur.nom && editeur.rue && editeur.npa && editeur.localite);

/** De quoi émettre une offre ou une facture valables : identité, adresse, IDE, compte. */
export const pretPourFacturer = Boolean(adresseConnue && editeur.ide && editeur.iban);

/** Ce qu'il manque pour facturer, en clair : affiché à l'administrateur, jamais au client. */
export function manquePourFacturer(): string[] {
  const manque: string[] = [];
  if (!editeur.nom) manque.push("EDITEUR_NOM");
  if (!editeur.rue) manque.push("EDITEUR_RUE");
  if (!editeur.npa) manque.push("EDITEUR_NPA");
  if (!editeur.localite) manque.push("EDITEUR_LOCALITE");
  if (!editeur.ide) manque.push("EDITEUR_IDE");
  if (!editeur.iban) manque.push("EDITEUR_IBAN");
  return manque;
}

/** L'adresse sur une ligne, ou rien tant qu'elle n'est pas connue. */
export function adresseSurUneLigne(): string {
  if (!adresseConnue) return "";
  return `${editeur.rue}${editeur.numero ? " " + editeur.numero : ""}, ${editeur.npa} ${editeur.localite}`;
}
