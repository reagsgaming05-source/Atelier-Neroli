/**
 * La QR-facture suisse.
 *
 * C'est ce qu'attend la comptabilité d'une commune : une facture avec, en bas,
 * une section paiement détachable portant un code QR avec la croix suisse. La
 * boursière la scanne dans e-banking, tout est rempli, elle valide. Sans elle,
 * quelqu'un ressaisit l'IBAN à la main — et se trompe un jour sur deux.
 *
 * Le code QR contient un texte de lignes au format arrêté par les
 * « Swiss Implementation Guidelines QR-bill » (version de charge utile 0200).
 * L'ordre des lignes est normatif : une ligne oubliée décale tout le reste et
 * la banque refuse le document. C'est pourquoi la charge utile se construit ici
 * par une liste explicite, une ligne par champ, plutôt que par concaténation.
 *
 * Deux types de référence coexistent, et le choix se déduit de l'IBAN :
 *  - QRR : la référence à 27 chiffres, réservée aux QR-IBAN (identifiant
 *    d'institution de 30000 à 31999). Clé de contrôle modulo 10 récursif.
 *  - SCOR : la référence créancier ISO 11649 (« RF… »), qui fonctionne avec
 *    n'importe quel IBAN suisse ordinaire. Clé de contrôle modulo 97-10, la
 *    même famille que celle de l'IBAN.
 *
 * Par défaut nous émettons du SCOR : tant qu'on n'a pas demandé un QR-IBAN à sa
 * banque, c'est la seule des deux qui soit utilisable.
 */

export const QR_TYPE = "SPC";
export const QR_VERSION = "0200";
export const QR_CODING = "1"; // UTF-8

export type Adresse = {
  nom: string;
  rue?: string | null;
  numero?: string | null;
  npa?: string | null;
  localite?: string | null;
  pays?: string | null;
};

export type QrFacture = {
  iban: string;
  creancier: Adresse;
  debiteur?: Adresse | null;
  /** En francs, pas en centimes. Omis pour une facture à montant libre. */
  montant?: number | null;
  monnaie?: "CHF" | "EUR";
  /** Référence structurée déjà calculée (QRR à 27 chiffres, ou SCOR « RF… »). */
  reference?: string | null;
  /** Message non structuré, 140 caractères au plus. */
  message?: string | null;
  /** Informations de facture structurées (S1/…), 140 caractères au plus. */
  infosFacture?: string | null;
};

/* ------------------------------------------------------------------ IBAN -- */

export const normaliserIban = (iban: string) => String(iban || "").replace(/\s+/g, "").toUpperCase();

/**
 * Le modulo 97-10 de l'IBAN (ISO 13616) et de la référence créancier
 * (ISO 11649) : mêmes mécaniques, même fonction. Les lettres valent 10 à 35, et
 * le reste se calcule par tranches pour ne jamais dépasser la précision d'un
 * nombre — un IBAN converti en entier fait une trentaine de chiffres.
 */
export function modulo97(chaine: string): number {
  let reste = 0;
  for (const c of chaine.toUpperCase()) {
    const valeur = /[0-9]/.test(c) ? c : /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : null;
    if (valeur === null) throw new Error(`Caractère inattendu dans « ${chaine} » : ${c}`);
    for (const chiffre of valeur) reste = (reste * 10 + Number(chiffre)) % 97;
  }
  return reste;
}

export function ibanValide(iban: string): boolean {
  const n = normaliserIban(iban);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(n)) return false;
  return modulo97(n.slice(4) + n.slice(0, 4)) === 1;
}

/** Un IBAN suisse dont l'identifiant d'institution est entre 30000 et 31999. */
export function estQrIban(iban: string): boolean {
  const n = normaliserIban(iban);
  if (!/^(CH|LI)[0-9]{19}$/.test(n)) return false;
  const institution = Number(n.slice(4, 9));
  return institution >= 30000 && institution <= 31999;
}

export const formaterIban = (iban: string) => normaliserIban(iban).replace(/(.{4})/g, "$1 ").trim();

/* ------------------------------------------------- Référence QRR (27 ch.) -- */

/**
 * Modulo 10 récursif, la clé de contrôle des anciens bulletins de versement
 * reprise par la QR-facture. La table vient de la norme ; chaque ligne est
 * l'état du report, chaque colonne le chiffre lu.
 */
const TABLE_MOD10 = [
  [0, 9, 4, 6, 8, 2, 7, 1, 3, 5],
  [9, 4, 6, 8, 2, 7, 1, 3, 5, 0],
  [4, 6, 8, 2, 7, 1, 3, 5, 0, 9],
  [6, 8, 2, 7, 1, 3, 5, 0, 9, 4],
  [8, 2, 7, 1, 3, 5, 0, 9, 4, 6],
  [2, 7, 1, 3, 5, 0, 9, 4, 6, 8],
  [7, 1, 3, 5, 0, 9, 4, 6, 8, 2],
  [1, 3, 5, 0, 9, 4, 6, 8, 2, 7],
  [3, 5, 0, 9, 4, 6, 8, 2, 7, 1],
  [5, 0, 9, 4, 6, 8, 2, 7, 1, 3],
];

export function cleModulo10(chiffres: string): number {
  let report = 0;
  for (const c of chiffres) {
    if (!/[0-9]/.test(c)) throw new Error(`Référence QRR : « ${c} » n'est pas un chiffre.`);
    report = TABLE_MOD10[report][Number(c)];
  }
  return (10 - report) % 10;
}

/** Complète à 26 chiffres puis ajoute la clé : 27 en tout. */
export function referenceQrr(base: string): string {
  const chiffres = String(base || "").replace(/\D/g, "");
  if (chiffres.length > 26) throw new Error("Une référence QRR tient sur 26 chiffres avant la clé.");
  const corps = chiffres.padStart(26, "0");
  return corps + String(cleModulo10(corps));
}

export function referenceQrrValide(reference: string): boolean {
  const n = String(reference || "").replace(/\s+/g, "");
  if (!/^[0-9]{27}$/.test(n)) return false;
  return cleModulo10(n.slice(0, 26)) === Number(n[26]);
}

/* ------------------------------------------- Référence créancier ISO 11649 -- */

/**
 * « RF » + deux chiffres de contrôle + jusqu'à 21 caractères. Les chiffres se
 * calculent comme ceux d'un IBAN : on déplace « RF00 » à la fin, on convertit,
 * et la clé vaut 98 moins le reste modulo 97.
 */
export function referenceScor(base: string): string {
  const corps = String(base || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (!corps) throw new Error("Une référence créancier ne peut pas être vide.");
  if (corps.length > 21) throw new Error("Une référence créancier tient sur 21 caractères.");
  const cle = 98 - modulo97(corps + "RF00");
  return "RF" + String(cle).padStart(2, "0") + corps;
}

export function referenceScorValide(reference: string): boolean {
  const n = String(reference || "").replace(/\s+/g, "").toUpperCase();
  if (!/^RF[0-9]{2}[0-9A-Z]{1,21}$/.test(n)) return false;
  return modulo97(n.slice(4) + n.slice(0, 4)) === 1;
}

/** Groupée par quatre pour l'impression, comme le veut la norme. */
export const formaterReference = (reference: string) => {
  const n = String(reference || "").replace(/\s+/g, "");
  if (/^[0-9]{27}$/.test(n)) {
    // Une référence QRR se lit « 21 00000 00003 13947 14300 00099 » : deux
    // chiffres, puis des groupes de cinq.
    return (n.slice(0, 2) + " " + (n.slice(2).match(/.{1,5}/g) ?? []).join(" ")).trim();
  }
  return (n.match(/.{1,4}/g) ?? []).join(" ");
};

/** La référence à imprimer pour une facture, du type qu'accepte cet IBAN. */
export function referencePourIban(iban: string, numeroFacture: string): { type: "QRR" | "SCOR"; reference: string } {
  const propre = String(numeroFacture || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (estQrIban(iban)) return { type: "QRR", reference: referenceQrr(propre.replace(/\D/g, "")) };
  return { type: "SCOR", reference: referenceScor(propre) };
}

/* --------------------------------------------------------- Charge utile -- */

const couper = (valeur: string | null | undefined, max: number) =>
  String(valeur ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, max);

/**
 * Une adresse occupe toujours sept lignes, même vide : c'est le décalage de ces
 * lignes-là qui casse le plus souvent une charge utile écrite à la main.
 * Le type « S » (structuré) sépare la rue, le numéro, le NPA et la localité.
 */
function lignesAdresse(adresse: Adresse | null | undefined): string[] {
  if (!adresse || !adresse.nom) return ["", "", "", "", "", "", ""];
  return [
    "S",
    couper(adresse.nom, 70),
    couper(adresse.rue, 70),
    couper(adresse.numero, 16),
    couper(adresse.npa, 16),
    couper(adresse.localite, 35),
    couper(adresse.pays || "CH", 2).toUpperCase(),
  ];
}

/**
 * Les lignes du code QR, dans l'ordre imposé : 31 jusqu'à « EPD », qui clôt les
 * données de paiement, plus la ligne d'informations de facture quand il y en a.
 */
export function lignesQrFacture(f: QrFacture): string[] {
  const iban = normaliserIban(f.iban);
  if (!ibanValide(iban)) throw new Error(`IBAN invalide : ${f.iban}`);

  const reference = f.reference ? String(f.reference).replace(/\s+/g, "").toUpperCase() : "";
  let typeReference: "QRR" | "SCOR" | "NON" = "NON";
  if (reference) {
    if (referenceQrrValide(reference)) typeReference = "QRR";
    else if (referenceScorValide(reference)) typeReference = "SCOR";
    else throw new Error(`Référence ni QRR ni SCOR : ${f.reference}`);
  }
  // Une référence QRR n'a de sens qu'avec un QR-IBAN, et réciproquement : la
  // banque rejette le mélange.
  if (typeReference === "QRR" && !estQrIban(iban)) throw new Error("Une référence QRR exige un QR-IBAN.");
  if (typeReference !== "QRR" && estQrIban(iban)) throw new Error("Un QR-IBAN exige une référence QRR.");

  return [
    QR_TYPE,
    QR_VERSION,
    QR_CODING,
    iban,
    ...lignesAdresse(f.creancier),
    ...lignesAdresse(null), // créancier final : réservé, toujours vide
    f.montant == null ? "" : f.montant.toFixed(2),
    f.monnaie ?? "CHF",
    ...lignesAdresse(f.debiteur),
    typeReference,
    reference,
    couper(f.message, 140),
    "EPD", // fin des données de paiement
    ...(f.infosFacture ? [couper(f.infosFacture, 140)] : []),
  ];
}

/** Le texte encodé dans le code QR. Les lignes sont séparées par un CRLF. */
export const chargeUtileQrFacture = (f: QrFacture) => lignesQrFacture(f).join("\r\n");

/* ---------------------------------------------- Informations de facture -- */

/**
 * Le champ « informations de facture » (norme Swico S1) permet au logiciel
 * comptable du client de rapprocher la facture sans ressaisie : numéro, date,
 * TVA, conditions. Chaque élément est préfixé par son code et séparé par une
 * barre verticale.
 */
export function infosFactureSwico(o: {
  numero: string;
  date: Date;
  tvaNumero?: string | null;
  tvaTaux?: number | null;
  montantCents: number;
  joursDePaiement: number;
}): string {
  const d = (x: Date) =>
    String(x.getFullYear()).slice(2) + String(x.getMonth() + 1).padStart(2, "0") + String(x.getDate()).padStart(2, "0");
  const morceaux = [`//S1/10/${o.numero.replace(/\//g, "")}/11/${d(o.date)}`];
  if (o.tvaNumero) morceaux.push(`30/${o.tvaNumero.replace(/[^0-9]/g, "")}`);
  if (o.tvaTaux) morceaux.push(`32/${o.tvaTaux}`);
  morceaux.push(`40/0:${o.joursDePaiement}`);
  return morceaux.join("/");
}
