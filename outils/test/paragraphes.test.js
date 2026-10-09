// Les paragraphes d'une page, tels que l'éditeur de texte les repère : ce qui coule ensemble, et ce que l'auteur a rompu exprès.
// Un bloc d'adresse n'est pas un paragraphe : si on les fondait, allonger un nom ferait passer un mot sur la ligne du dessous.
const test = require('node:test');
const assert = require('node:assert/strict');
const { extraire } = require('./aide');
const { edParagraphes, edRetoursVoulus } = extraire('  function edNouvelleLigne(m) {', '  // Rendu net d\'une zone de la page.', '{ edParagraphes, edRetoursVoulus }');

const POL = { nom: 'Corps', gras: false, italique: false, genre: 'Helvetica' };
// Une ligne = un morceau, comme pdf.js en rend un par affichage. Largeur : 0,5 corps par caractère (police à chasse fixe, c'est l'estimation de la fonction).
const ligne = (texte, x, base, size) => ({ str: texte, x, base, size: size || 10, w: texte.length * 5 * ((size || 10) / 10), pol: POL });
const page = { Wd: 595, Hd: 842 };
const textes = blocs => blocs.map(b => b.text);

// Un paragraphe de repère : le bord droit du texte de la page est celui de ses lignes pleines.
const repere = base0 => [
  ligne('le texte courant de cette page est composé en lignes qui touchent toutes le bord droit', 70, base0),
  ligne('de la colonne, comme le fait un traitement de texte quand un mot ne tient plus et passe', 70, base0 + 12),
  ligne('à la ligne suivante, ce qui rend la marge droite lisible par la machine', 70, base0 + 24),
];

test('un bloc d\'adresse : une ligne par ligne, rien ne se fond dans la voisine', () => {
  const blocs = edParagraphes([
    ...repere(300),
    ligne('Madame Claire Exemple', 70, 100), ligne('Chemin des Vignes 12', 70, 112), ligne('1001 Exemple-sur-Lac', 70, 124),
  ], page);
  const t = textes(blocs);
  assert.ok(t.includes('Madame Claire Exemple') && t.includes('Chemin des Vignes 12') && t.includes('1001 Exemple-sur-Lac'), JSON.stringify(t));
  assert.ok(t.some(x => /^le texte courant de cette page.* de la colonne.* à la ligne suivante/.test(x)), 'le paragraphe, lui, coule : ' + JSON.stringify(t));
});

test('une ligne longue suivie d\'une ligne qui ouvre une autre phrase : deux blocs', () => {
  // la plus longue ligne du bloc, suivie d'une ligne qui commence par une majuscule (le défaut vu : « Responsable… » fondu dans « Téléphone… »)
  const blocs = edParagraphes([
    ...repere(300),
    ligne('Responsable du dossier : Madame Claire Exemple', 70, 100), ligne('Téléphone : 021 000 00 00', 70, 112), ligne('Courriel : claire.exemple@commune.example', 70, 124),
  ], page);
  const t = textes(blocs);
  assert.ok(t.includes('Responsable du dossier : Madame Claire Exemple'), JSON.stringify(t));
  assert.ok(t.includes('Téléphone : 021 000 00 00'), JSON.stringify(t));
});

test('un paragraphe qui s\'arrête à la marge coule en un seul bloc', () => {
  const blocs = edParagraphes(repere(100), page);
  assert.equal(blocs.length, 1);
  assert.equal(blocs[0].text, 'le texte courant de cette page est composé en lignes qui touchent toutes le bord droit de la colonne, comme le fait un traitement de texte quand un mot ne tient plus et passe à la ligne suivante, ce qui rend la marge droite lisible par la machine');
});

test('un texte justifié coule même quand une ligne commence par une majuscule', () => {
  // toutes les lignes touchent le bord : la place ne dit rien, elles sont solidaires
  const large = 'x'.repeat(80);
  const blocs = edParagraphes([
    { ...ligne('Nous avons bien reçu votre demande du 3 mars concernant la construction d\'un', 70, 100), w: 400 },
    { ...ligne('Exemple-sur-Lac est situé à une altitude moyenne de quatre cents mètres au-dessus', 70, 112), w: 400 },
    { ...ligne('du lac, ce qui explique le climat doux que connaissent les habitants de la région', 70, 124), w: 400 },
    ligne('et qui est apprécié.', 70, 136),
  ], page);
  assert.equal(blocs.length, 1, JSON.stringify(textes(blocs)));
  assert.ok(large.length === 80);
});

test('une liste numérotée : un bloc par article', () => {
  const blocs = edParagraphes([
    ligne('1. Approbation de l\'ordre du jour : accepté à l\'unanimité.', 70, 100),
    ligne('2. Préavis n° 12/2026 : crédit de CHF 480 000 pour la réfection', 70, 112),
    ligne('3. Budget 2027 : présenté par la commission des finances.', 70, 124),
  ], page);
  assert.equal(blocs.length, 3, JSON.stringify(textes(blocs)));
});

test('un mot coupé en fin de ligne se rejoint sans espace', () => {
  const blocs = edParagraphes([
    { ...ligne('la salle polyvalente, construite en 1974, ne répond plus aux normes de sécu-', 70, 100), w: 400 },
    { ...ligne('rité ni d\'isolation actuelles. La Municipalité vous propose un crédit pour', 70, 112), w: 395 },
    ligne('sa réfection.', 70, 124),
  ], page);
  assert.equal(blocs.length, 1, JSON.stringify(textes(blocs)));
  assert.ok(blocs[0].text.includes('sécu-rité'), blocs[0].text);
});

test('deux lignes courtes d\'une adresse postale restent deux blocs', () => {
  const blocs = edParagraphes([...repere(300), ligne('Rue du Collège 4', 70, 100), ligne('1000 Exemple-sur-Lac', 70, 112)], page);
  const t = textes(blocs);
  assert.ok(t.includes('Rue du Collège 4') && t.includes('1000 Exemple-sur-Lac'), JSON.stringify(t));
});

test('les marges de colonne sont portées par les blocs : le bord droit que plusieurs lignes se partagent', () => {
  const blocs = edParagraphes([...repere(100), ligne('Exemple-sur-Lac, le 12 mars 2026', 395, 60)], page);
  const date = blocs.find(b => /12 mars/.test(b.text));
  const para = blocs.find(b => /texte courant/.test(b.text));
  assert.ok(date.colDroite > 0 && Math.abs(date.colDroite - para.colDroite) < 1e-6, date.colDroite + ' / ' + para.colDroite);
});

test('edRetoursVoulus : une seule ligne, rien à couper', () => {
  assert.deepEqual(edRetoursVoulus([]), []);
});
