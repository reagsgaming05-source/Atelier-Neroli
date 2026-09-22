/*
 * Le document qui pose pour les captures du mode d'emploi.
 *
 * Il est fabriqué ici, et non pris dans un vrai dossier : le dépôt est public,
 * et rien de ce qui passe par le greffe n'a sa place dedans. Chaque page porte
 * la mention EXEMPLE en filigrane, pour qu'une capture sortie de son contexte
 * ne puisse pas être prise pour une pièce.
 *
 * Il lui faut du vrai texte — c'est ce qui se cherche, se sélectionne, se
 * corrige et se caviarde dans les captures — et un tableau de montants, pour
 * montrer « copier un tableau vers Excel ».
 */
const path = require('path');
const { PDFDocument, StandardFonts, rgb, degrees } = require(path.join(__dirname, '..', 'libs', 'cantoo-pdf-lib-2.11.0', 'dist', 'pdf-lib.min.js'));

const ENCRE = rgb(0.09, 0.10, 0.13);
const GRIS = rgb(0.42, 0.45, 0.50);
const TRAIT = rgb(0.82, 0.84, 0.87);

const ARTICLES = [
  ['Article premier — But', [
    'Le présent règlement fixe les modalités de dépôt, de collecte et de traitement des',
    'déchets sur le territoire communal. Il s\'applique aux ménages, aux administrations',
    'et aux entreprises qui ne disposent pas de leur propre filière de valorisation.',
  ]],
  ['Article 2 — Définitions', [
    'On entend par déchets ménagers les résidus produits par les ménages, à l\'exclusion',
    'des déchets encombrants, des déchets spéciaux et des déchets de chantier. Les',
    'déchets recyclables sont ceux que la déchetterie reprend séparément.',
  ]],
  ['Article 3 — Jours de collecte', [
    'La collecte des ordures ménagères a lieu le mardi et le vendredi, dès sept heures.',
    'Les conteneurs sont sortis la veille au soir au plus tôt et repris le jour même.',
    'Les jours fériés décalent la collecte au premier jour ouvrable suivant.',
  ]],
  ['Article 4 — Taxe au sac', [
    'La taxe au sac est perçue sur les sacs officiels vendus dans les commerces de la',
    'commune. Son montant est fixé par le tarif annexé au présent règlement et revu',
    'chaque année par la Municipalité.',
  ]],
  ['Article 5 — Déchetterie', [
    'La déchetterie est ouverte du lundi au samedi selon l\'horaire affiché à l\'entrée.',
    'L\'accès est réservé aux habitants de la commune, sur présentation de la carte',
    'remise par le greffe. Les entreprises y accèdent contre facturation au poids.',
  ]],
  ['Article 6 — Infractions', [
    'Les dépôts sauvages sont passibles d\'une amende. Les frais d\'enlèvement sont mis',
    'à la charge de l\'auteur du dépôt lorsqu\'il peut être identifié.',
  ]],
];

const TARIF = [
  ['Prestation', 'Unité', 'Montant'],
  ['Sac officiel 17 litres', 'le rouleau de 10', "12.50"],
  ['Sac officiel 35 litres', 'le rouleau de 10', "24.00"],
  ['Conteneur 140 litres', "à l'année", "186.00"],
  ['Conteneur 800 litres', "à l'année", "1'062.00"],
  ['Carte de déchetterie', 'le duplicata', "20.00"],
  ['Enlèvement encombrants', 'le mètre cube', "95.50"],
];

async function fabriquer() {
  const doc = await PDFDocument.create();
  doc.setTitle('Règlement communal sur la gestion des déchets (exemple)');
  doc.setAuthor('Greffe communal');
  doc.setSubject("Document d'exemple pour le mode d'emploi de Blonay PDF");
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const gras = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89;

  const page = (numero, total) => {
    const p = doc.addPage([W, H]);
    // Le filigrane d'abord : le texte se pose par-dessus.
    p.drawText('EXEMPLE', {
      x: 92, y: 300, size: 96, font: gras, color: rgb(0.93, 0.94, 0.95),
      rotate: degrees(32),
    });
    p.drawText('Commune de Blonay — greffe', { x: 56, y: H - 46, size: 9, font: reg, color: GRIS });
    p.drawLine({ start: { x: 56, y: H - 56 }, end: { x: W - 56, y: H - 56 }, thickness: 0.6, color: TRAIT });
    p.drawText('Document d\'exemple — aucune valeur officielle', { x: 56, y: 38, size: 8, font: reg, color: GRIS });
    p.drawText(numero + ' / ' + total, { x: W - 84, y: 38, size: 9, font: reg, color: GRIS });
    return p;
  };

  const TOTAL = 6;
  // Page de garde.
  const p1 = page(1, TOTAL);
  p1.drawText('Règlement communal', { x: 56, y: H - 200, size: 30, font: gras, color: ENCRE });
  p1.drawText('sur la gestion des déchets', { x: 56, y: H - 238, size: 30, font: gras, color: ENCRE });
  p1.drawLine({ start: { x: 56, y: H - 262 }, end: { x: 260, y: H - 262 }, thickness: 2.5, color: rgb(0.83, 0.20, 0.16) });
  p1.drawText('Adopté par le Conseil communal le 12 mars', { x: 56, y: H - 300, size: 12, font: reg, color: GRIS });
  p1.drawText('Entrée en vigueur le 1er juillet', { x: 56, y: H - 320, size: 12, font: reg, color: GRIS });
  p1.drawText('Ce document sert d\'exemple au mode d\'emploi de Blonay PDF.', { x: 56, y: 130, size: 10, font: reg, color: GRIS });
  p1.drawText('Il ne contient aucune donnée réelle.', { x: 56, y: 114, size: 10, font: reg, color: GRIS });

  // Les articles, deux par page.
  let p = null, y = 0;
  ARTICLES.forEach((art, i) => {
    if (i % 2 === 0) { p = page(2 + i / 2, TOTAL); y = H - 110; }
    p.drawText(art[0], { x: 56, y, size: 14, font: gras, color: ENCRE });
    y -= 26;
    art[1].forEach((ligne) => { p.drawText(ligne, { x: 56, y, size: 11, font: reg, color: ENCRE }); y -= 18; });
    y -= 34;
  });

  // Le tarif : un vrai tableau, colonnes séparées par des blancs qui traversent.
  const pt = page(5, TOTAL);
  pt.drawText('Annexe — Tarif', { x: 56, y: H - 110, size: 14, font: gras, color: ENCRE });
  let yt = H - 152;
  TARIF.forEach((ligne, i) => {
    const f = i === 0 ? gras : reg;
    pt.drawText(ligne[0], { x: 56, y: yt, size: 11, font: f, color: ENCRE });
    pt.drawText(ligne[1], { x: 300, y: yt, size: 11, font: f, color: i === 0 ? ENCRE : GRIS });
    pt.drawText(ligne[2], { x: 470, y: yt, size: 11, font: f, color: ENCRE });
    if (i === 0) { yt -= 8; pt.drawLine({ start: { x: 56, y: yt + 14 }, end: { x: W - 56, y: yt + 14 }, thickness: 0.6, color: TRAIT }); }
    yt -= 24;
  });
  pt.drawText('Les montants s\'entendent en francs, taxe comprise.', { x: 56, y: yt - 12, size: 10, font: reg, color: GRIS });

  // Une dernière page, pour que « deux pages côte à côte » ait de quoi montrer.
  const p6 = page(6, TOTAL);
  p6.drawText('Dispositions finales', { x: 56, y: H - 110, size: 14, font: gras, color: ENCRE });
  [
    'Le présent règlement abroge toute disposition antérieure contraire.',
    'La Municipalité est chargée de son application.',
    'Les recours contre les décisions prises en application du présent règlement',
    's\'exercent dans les trente jours auprès de l\'autorité cantonale compétente.',
  ].forEach((l, i) => p6.drawText(l, { x: 56, y: H - 140 - i * 18, size: 11, font: reg, color: ENCRE }));
  p6.drawText('Au nom de la Municipalité', { x: 330, y: 240, size: 11, font: reg, color: ENCRE });
  p6.drawText('Le syndic', { x: 330, y: 220, size: 11, font: reg, color: GRIS });
  p6.drawText('La secrétaire', { x: 330, y: 200, size: 11, font: reg, color: GRIS });

  return Buffer.from(await doc.save());
}

module.exports = { fabriquer };

if (require.main === module) {
  const fs = require('fs');
  const ou = process.argv[2] || path.join(__dirname, 'exemple.pdf');
  fabriquer().then((o) => { fs.writeFileSync(ou, o); console.log(ou + ' — ' + o.length + ' octets'); });
}
