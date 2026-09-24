/**
 * La QR-facture, éprouvée sur ce qui coûte cher quand c'est faux.
 *
 * Une facture part chez une boursière communale qui la scanne dans son
 * e-banking. Si l'ordre des lignes est décalé d'un cran, sa banque refuse le
 * document ; si la clé de contrôle est fausse, le paiement part sans référence
 * et personne ne sait à quoi il correspond. Rien de tout cela ne se voit à la
 * relecture — d'où ces vérifications.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  chargeUtileQrFacture,
  cleModulo10,
  estQrIban,
  formaterReference,
  ibanValide,
  infosFactureSwico,
  lignesQrFacture,
  modulo97,
  normaliserIban,
  referencePourIban,
  referenceQrr,
  referenceQrrValide,
  referenceScor,
  referenceScorValide,
} from "../src/lib/qr-facture";

/* ------------------------------------------------------------------ IBAN -- */

test("l'IBAN d'exemple de la norme est reconnu, et une faute de frappe ne l'est pas", () => {
  // CH93 0076 2011 6238 5295 7 : l'exemple publié de la norme ISO 13616.
  assert.equal(ibanValide("CH93 0076 2011 6238 5295 7"), true);
  assert.equal(ibanValide("CH9300762011623852957"), true);
  // Deux chiffres intervertis : c'est précisément ce que la clé doit attraper.
  assert.equal(ibanValide("CH93 0076 2011 6238 5297 5"), false);
  assert.equal(ibanValide("CH00 0076 2011 6238 5295 7"), false);
  assert.equal(ibanValide("pas un iban"), false);
});

test("le modulo 97 d'un IBAN valide vaut toujours 1", () => {
  const n = normaliserIban("CH93 0076 2011 6238 5295 7");
  assert.equal(modulo97(n.slice(4) + n.slice(0, 4)), 1);
});

test("un QR-IBAN se reconnaît à son identifiant d'institution", () => {
  // La plage réservée va de 30000 à 31999. Les deux bornes comptent, et celles
  // d'à côté ne doivent pas passer : une facture émise avec un IBAN ordinaire
  // pris pour un QR-IBAN part avec le mauvais type de référence.
  assert.equal(estQrIban("CH58 2999 9000 0000 0000 0"), false); // 29999, juste avant
  assert.equal(estQrIban("CH58 3000 0000 0000 0000 0"), true); // 30000, première
  assert.equal(estQrIban("CH44 3199 9123 0008 8901 2"), true); // 31999, dernière
  assert.equal(estQrIban("CH58 3200 0000 0000 0000 0"), false); // 32000, juste après
  assert.equal(estQrIban("CH93 0076 2011 6238 5295 7"), false); // 00762 : un IBAN ordinaire
});

/* ------------------------------------------------------ Référence SCOR -- */

test("la référence créancier de la norme ISO 11649 se recalcule à l'identique", () => {
  // RF18 5390 0754 7034 : l'exemple publié de la norme.
  assert.equal(referenceScor("539007547034"), "RF18539007547034");
  assert.equal(referenceScorValide("RF18 5390 0754 7034"), true);
  assert.equal(referenceScorValide("RF18539007547034"), true);
});

test("une référence créancier dont un caractère change est refusée", () => {
  const bonne = referenceScor("FACT2026000123");
  assert.equal(referenceScorValide(bonne), true);
  // La clé existe pour attraper la ressaisie : on la met à l'épreuve sur
  // chaque position du corps de la référence.
  for (let i = 4; i < bonne.length; i++) {
    const autre = bonne[i] === "0" ? "1" : "0";
    const abimee = bonne.slice(0, i) + autre + bonne.slice(i + 1);
    assert.equal(referenceScorValide(abimee), false, `la faute en position ${i} passe inaperçue`);
  }
});

test("une référence créancier trop longue ou vide est refusée à l'écriture", () => {
  assert.throws(() => referenceScor(""), /vide/);
  assert.throws(() => referenceScor("A".repeat(22)), /21/);
  assert.equal(referenceScor("A".repeat(21)).length, 25);
});

/* ------------------------------------------------------- Référence QRR -- */

test("la référence QRR fait 27 chiffres et se relit", () => {
  const r = referenceQrr("313947143000901");
  assert.match(r, /^[0-9]{27}$/);
  assert.equal(referenceQrrValide(r), true);
  // Complétée à gauche par des zéros : le corps du numéro est conservé.
  assert.ok(r.startsWith("00000000000"));
  assert.ok(r.slice(0, 26).endsWith("313947143000901"));
});

test("une référence QRR dont un chiffre change est refusée", () => {
  const bonne = referenceQrr("2026000123");
  for (let i = 0; i < 26; i++) {
    const autre = bonne[i] === "0" ? "7" : "0";
    const abimee = bonne.slice(0, i) + autre + bonne.slice(i + 1);
    assert.equal(referenceQrrValide(abimee), false, `la faute en position ${i} passe inaperçue`);
  }
  // Et la clé elle-même est vérifiée.
  const cleFausse = bonne.slice(0, 26) + ((Number(bonne[26]) + 1) % 10);
  assert.equal(referenceQrrValide(cleFausse), false);
});

test("le modulo 10 récursif rend bien un chiffre, et zéro pour une suite de zéros", () => {
  assert.equal(cleModulo10("0".repeat(26)), 0);
  for (const essai of ["1", "12345", "9".repeat(26)]) {
    const cle = cleModulo10(essai);
    assert.ok(cle >= 0 && cle <= 9, `clé hors bornes pour ${essai}`);
    // La propriété qui définit la clé : la suite complétée retombe sur zéro.
    assert.equal(cleModulo10(essai + String(cle)), 0);
  }
});

test("le type de référence se déduit de l'IBAN", () => {
  const ordinaire = referencePourIban("CH93 0076 2011 6238 5295 7", "F-2026-0042");
  assert.equal(ordinaire.type, "SCOR");
  assert.equal(referenceScorValide(ordinaire.reference), true);

  const qr = referencePourIban("CH44 3199 9123 0008 8901 2", "F-2026-0042");
  assert.equal(qr.type, "QRR");
  assert.equal(referenceQrrValide(qr.reference), true);
});

test("la référence s'imprime groupée comme le veut la norme", () => {
  // Une référence créancier se lit par quatre.
  assert.equal(formaterReference("RF18539007547034"), "RF18 5390 0754 7034");
  // Une référence QRR se lit deux chiffres, puis cinq par cinq.
  const qrr = referenceQrr("313947143000901");
  assert.equal(qrr.length, 27);
  const groupes = formaterReference(qrr).split(" ");
  assert.deepEqual(groupes.map((g) => g.length), [2, 5, 5, 5, 5, 5]);
  assert.equal(groupes.join(""), qrr, "le regroupement ne doit rien perdre ni rien ajouter");
});

/* ---------------------------------------------------------- Charge utile -- */

const CREANCIER = {
  nom: "Blonay PDF Sàrl",
  rue: "Route de Vevey",
  numero: "12",
  npa: "1807",
  localite: "Blonay",
  pays: "CH",
};
const DEBITEUR = {
  nom: "Commune de Saint-Exemple",
  rue: "Place du Village",
  numero: "1",
  npa: "1000",
  localite: "Lausanne",
  pays: "CH",
};

test("la charge utile place chaque champ à la ligne que la norme lui donne", () => {
  const reference = referenceScor("F20260042");
  const l = lignesQrFacture({
    iban: "CH93 0076 2011 6238 5295 7",
    creancier: CREANCIER,
    debiteur: DEBITEUR,
    montant: 1990,
    reference,
    message: "Abonnement Administration 2026",
  });

  // Les numéros de ligne comptent à partir de 1, comme dans la norme.
  assert.equal(l[0], "SPC");
  assert.equal(l[1], "0200");
  assert.equal(l[2], "1");
  assert.equal(l[3], "CH9300762011623852957");
  assert.deepEqual(l.slice(4, 11), ["S", "Blonay PDF Sàrl", "Route de Vevey", "12", "1807", "Blonay", "CH"]);
  // Créancier final : sept lignes vides, jamais omises.
  assert.deepEqual(l.slice(11, 18), ["", "", "", "", "", "", ""]);
  assert.equal(l[18], "1990.00");
  assert.equal(l[19], "CHF");
  assert.deepEqual(l.slice(20, 27), ["S", "Commune de Saint-Exemple", "Place du Village", "1", "1000", "Lausanne", "CH"]);
  assert.equal(l[27], "SCOR");
  assert.equal(l[28], reference);
  assert.equal(l[29], "Abonnement Administration 2026");
  assert.equal(l[30], "EPD");
  // Jusqu'à « EPD » compris : 31 lignes, ni plus ni moins.
  assert.equal(l.indexOf("EPD"), 30);
  assert.equal(l.length, 31);
});

test("les lignes du code QR sont séparées par un retour chariot", () => {
  const texte = chargeUtileQrFacture({
    iban: "CH93 0076 2011 6238 5295 7",
    creancier: CREANCIER,
    montant: 49,
  });
  assert.ok(texte.startsWith("SPC\r\n0200\r\n1\r\n"));
  assert.equal(texte.split("\r\n").length, 31);
});

test("sans débiteur ni montant, les lignes restent en place", () => {
  const l = lignesQrFacture({ iban: "CH93 0076 2011 6238 5295 7", creancier: CREANCIER });
  assert.equal(l[18], "", "montant libre : la ligne existe, vide");
  assert.equal(l[19], "CHF");
  assert.deepEqual(l.slice(20, 27), ["", "", "", "", "", "", ""]);
  assert.equal(l[27], "NON");
  assert.equal(l[28], "");
  assert.equal(l.length, 31);
});

test("l'information de facture s'ajoute après « EPD », et seulement si elle existe", () => {
  const sans = lignesQrFacture({ iban: "CH93 0076 2011 6238 5295 7", creancier: CREANCIER });
  assert.equal(sans.length, 31);
  const avec = lignesQrFacture({
    iban: "CH93 0076 2011 6238 5295 7",
    creancier: CREANCIER,
    infosFacture: "//S1/10/F20260042/11/260315/30/CHE116281277/32/8.1/40/0:30",
  });
  assert.equal(avec.length, 32);
  assert.equal(avec[30], "EPD");
  assert.ok(avec[31].startsWith("//S1/"));
});

test("un mélange QR-IBAN et référence libre est refusé des deux côtés", () => {
  // La banque rejette ces deux combinaisons : autant s'en apercevoir ici.
  assert.throws(
    () => lignesQrFacture({ iban: "CH44 3199 9123 0008 8901 2", creancier: CREANCIER }),
    /QR-IBAN exige une référence QRR/,
  );
  assert.throws(
    () =>
      lignesQrFacture({
        iban: "CH93 0076 2011 6238 5295 7",
        creancier: CREANCIER,
        reference: referenceQrr("42"),
      }),
    /référence QRR exige un QR-IBAN/,
  );
});

test("un IBAN invalide n'arrive jamais jusqu'au code QR", () => {
  assert.throws(() => lignesQrFacture({ iban: "CH00 0000 0000 0000 0000 0", creancier: CREANCIER }), /IBAN invalide/);
});

test("les champs trop longs sont coupés, et un retour à la ligne ne casse pas la charge utile", () => {
  const l = lignesQrFacture({
    iban: "CH93 0076 2011 6238 5295 7",
    creancier: { ...CREANCIER, nom: "A".repeat(200) },
    message: "Première ligne\nDeuxième ligne",
  });
  assert.equal(l[5].length, 70);
  assert.equal(l[29], "Première ligne Deuxième ligne");
  assert.equal(l.length, 31, "un retour à la ligne dans un champ ajouterait une ligne fantôme");
});

test("le montant s'écrit toujours avec deux décimales", () => {
  const montant = (m: number) => lignesQrFacture({ iban: "CH9300762011623852957", creancier: CREANCIER, montant: m })[18];
  assert.equal(montant(1990), "1990.00");
  assert.equal(montant(89), "89.00");
  assert.equal(montant(4.9), "4.90");
  assert.equal(montant(1990.5), "1990.50");
});

/* -------------------------------------------------- Informations Swico -- */

test("l'information de facture Swico porte le numéro, la date et les conditions", () => {
  const texte = infosFactureSwico({
    numero: "F-2026-0042",
    date: new Date(2026, 2, 15),
    tvaNumero: "CHE-116.281.277",
    tvaTaux: 8.1,
    montantCents: 199000,
    joursDePaiement: 30,
  });
  // Le numéro de TVA s'écrit sans « CHE » et sans séparateurs : c'est ce que
  // demande la norme Swico, et le logiciel comptable du client le relit ainsi.
  assert.equal(texte, "//S1/10/F-2026-0042/11/260315/30/116281277/32/8.1/40/0:30");
  assert.ok(texte.length <= 140);
});

test("sans numéro de TVA, l'information reste valable", () => {
  const texte = infosFactureSwico({
    numero: "F-2026-0001",
    date: new Date(2026, 0, 1),
    montantCents: 4900,
    joursDePaiement: 30,
  });
  assert.equal(texte, "//S1/10/F-2026-0001/11/260101/40/0:30");
});
