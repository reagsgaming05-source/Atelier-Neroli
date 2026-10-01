// La langue de l'application fenêtrée (desktop/langue.js) : le choix (essais, réglage, système), la traduction
// des menus, des fenêtres de dialogue et des réponses faites à la page, et le dictionnaire face au code.
const test = require('node:test');
const assert = require('node:assert');
const { relever } = require('../i18n/extraire-bureau');

delete process.env.AKTUM_LANGUE;
const langue = require('../desktop/langue');
const dico = require('../desktop/langue-de.json');

test('le choix : l\'essai impose, sinon le réglage, sinon la langue du système', () => {
  assert.strictEqual(langue.initialiser('en-US', undefined, null), 'fr');
  assert.strictEqual(langue.initialiser('de-CH', undefined, null), 'de');
  assert.strictEqual(langue.initialiser('de-CH', 'fr', null), 'fr', 'le réglage l\'emporte sur le système');
  assert.strictEqual(langue.initialiser('fr-CH', 'de', null), 'de');
  assert.strictEqual(langue.initialiser('fr-CH', 'it', null), 'fr', 'un réglage inconnu est ignoré');
  process.env.AKTUM_LANGUE = 'de';
  assert.strictEqual(langue.initialiser('fr-CH', 'fr', null), 'de', 'l\'essai impose');
  delete process.env.AKTUM_LANGUE;
});

test('choisir retient le choix et prévient', () => {
  const ecrit = [], vus = [];
  langue.initialiser('fr-CH', undefined, { ecrire: (l) => ecrit.push(l) });
  langue.surChangement((l) => vus.push(l));
  assert.strictEqual(langue.choisir('de'), 'de');
  assert.strictEqual(langue.choisir('de'), 'de');
  assert.strictEqual(langue.choisir('xx'), 'de');
  assert.deepStrictEqual(ecrit, ['de']);
  assert.deepStrictEqual(vus, ['de']);
});

test('en français rien ne bouge ; en allemand, les textes, assemblés ou non, se traduisent', () => {
  langue.initialiser('fr-CH', undefined, null);
  assert.strictEqual(langue.t('Annuler'), 'Annuler');
  assert.deepStrictEqual(langue.resultat({ ok: false, erreur: 'Compte inconnu.' }), { ok: false, erreur: 'Compte inconnu.' });
  langue.initialiser('de-CH', undefined, null);
  assert.strictEqual(langue.t('Annuler'), 'Abbrechen');
  assert.strictEqual(langue.t('Compte : Marie\nDossier des données : /x'), 'Konto: Marie\nDatenordner: /x');
  assert.strictEqual(langue.t('Trop d’essais. Patientez 30 secondes avant de réessayer.'), 'Zu viele Versuche. Bitte warten Sie 30 Sekunden, bevor Sie es erneut versuchen.');
  assert.strictEqual(langue.t('Texte inconnu'), 'Texte inconnu');
});

test('les menus : étiquettes et sous-menus traduits, noms de fichiers et de langues laissés', () => {
  langue.initialiser('de-CH', undefined, null);
  const m = langue.menu([{ label: 'Fichier', submenu: [{ label: 'Ouvrir…', accelerator: 'CmdOrCtrl+O' }, { brut: true, label: 'Annuler.pdf', sublabel: 'Fichier' }] }]);
  assert.strictEqual(m[0].label, 'Datei');
  assert.strictEqual(m[0].submenu[0].label, 'Öffnen…');
  assert.strictEqual(m[0].submenu[0].accelerator, 'CmdOrCtrl+O');
  assert.strictEqual(m[0].submenu[1].label, 'Annuler.pdf');
  assert.strictEqual(m[0].submenu[1].sublabel, 'Fichier');
  assert.ok(!('brut' in m[0].submenu[1]));
});

test('les fenêtres de dialogue : titre, message, détail, boutons, filtres', () => {
  langue.initialiser('de-CH', undefined, null);
  const o = langue.options({ type: 'question', title: 'Rapport de diagnostic', message: 'Se déconnecter d’Aktum PDF ?', detail: 'Compte : Marie', buttons: ['Se déconnecter', 'Annuler'], filters: [{ name: 'Document PDF', extensions: ['pdf'] }] });
  assert.strictEqual(o.type, 'question');
  assert.strictEqual(o.title, 'Diagnosebericht');
  assert.strictEqual(o.message, 'Von Aktum PDF abmelden?');
  assert.strictEqual(o.detail, 'Konto: Marie');
  assert.deepStrictEqual(o.buttons, ['Abmelden', 'Abbrechen']);
  assert.strictEqual(o.filters[0].name, 'PDF-Dokument');
  assert.deepStrictEqual(o.filters[0].extensions, ['pdf']);
});

test('la réponse faite à la page : un message ou un objet simple, jamais des octets', () => {
  langue.initialiser('de-CH', undefined, null);
  assert.strictEqual(langue.resultat('Compte inconnu.'), 'Unbekanntes Konto.');
  assert.deepStrictEqual(langue.resultat({ ok: false, erreur: 'Compte inconnu.', chemin: '/Annuler' }), { ok: false, erreur: 'Unbekanntes Konto.', chemin: '/Annuler' });
  const octets = Buffer.from('Annuler');
  assert.strictEqual(langue.resultat(octets), octets);
  assert.strictEqual(langue.resultat(null), null);
  assert.deepStrictEqual(langue.resultat(['Annuler']), ['Annuler']);
});

test('chaque texte de l\'application fenêtrée a sa traduction, et le dictionnaire n\'en garde pas d\'inutiles', () => {
  const r = relever();
  const manque = [], orphelins = [];
  for (const s of ['litteraux', 'profil']) {
    for (const k of Object.keys(r[s])) if (!(k in dico[s])) manque.push(s + ' : ' + JSON.stringify(k));
    for (const k of Object.keys(dico[s])) if (!(k in r[s])) orphelins.push(s + ' : ' + JSON.stringify(k));
  }
  assert.deepStrictEqual(manque, [], 'à traduire dans desktop/langue-de.json');
  assert.deepStrictEqual(orphelins, []);
});

test('les traductions de l\'application fenêtrée suivent les règles de la maison', () => {
  const faux = [];
  for (const s of ['litteraux', 'profil']) for (const [k, v] of Object.entries(dico[s])) {
    if (!v.trim() && k.trim()) faux.push('vide : ' + k);
    if (v.includes('ß')) faux.push('ß : ' + v);
    if (/\bdu\b|\bdein(e|en|em|er|es)?\b/i.test(v.replace(/«[^»]*»/g, ''))) faux.push('tutoiement : ' + v);
    if (/„|“|”/.test(v)) faux.push('guillemets : ' + v);
  }
  assert.deepStrictEqual(faux, []);
});
