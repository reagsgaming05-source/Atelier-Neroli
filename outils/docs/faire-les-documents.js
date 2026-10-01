/*
 * Les documents du dossier livré, en PDF : guide d'administration et de déploiement, fiche de
 * protection des données, fiche produit, procédure de support.
 *
 *   node faire-les-documents.js [dossier-de-sortie]
 *
 * Les coordonnées de l'éditeur ne sont PAS dans le dépôt, qui est public : elles viennent
 * des mêmes variables d'environnement que le site (EDITEUR_NOM, EDITEUR_RUE, EDITEUR_NUMERO,
 * EDITEUR_NPA, EDITEUR_LOCALITE, EDITEUR_TELEPHONE, EDITEUR_EMAIL, EDITEUR_EMAIL_SUPPORT). Sans
 * elles, les documents renvoient aux mentions légales du site plutôt que d'inventer une adresse.
 *
 * Les délais de support sont des engagements : ils se changent ICI (DELAIS), au même endroit que
 * les documents qui les annoncent, et rien d'autre dans le dépôt ne les répète.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', 'desktop', 'node_modules', 'playwright-core'));

// En jours ouvrables. Tenables par une personne seule : accusé de réception sous un à deux jours,
// jamais de promesse de correctif à heure fixe.
const DELAIS = {
  D1A: '1 jour ouvrable', D1R: '2 jours ouvrables', D1C: 'Contournement sous 5 jours ouvrables ; correctif dès que la cause est comprise',
  D2A: '1 jour ouvrable', D2R: '3 jours ouvrables', D2C: 'Contournement sous 10 jours ouvrables ; correctif dans la version suivante',
  D3A: '2 jours ouvrables', D3R: '5 jours ouvrables',
  D4A: '2 jours ouvrables', D4R: '5 jours ouvrables',
};

const e = process.env;
const adresse = [e.EDITEUR_NOM, [e.EDITEUR_RUE, e.EDITEUR_NUMERO].filter(Boolean).join(' '), [e.EDITEUR_NPA, e.EDITEUR_LOCALITE].filter(Boolean).join(' ')].filter(Boolean).join(', ');
const contact = [e.EDITEUR_TELEPHONE, e.EDITEUR_EMAIL].filter(Boolean).join(' · ');
const COORDONNEES = (adresse || contact) ? 'Éditeur : ' + [adresse, contact].filter(Boolean).join(' — ') + '.' : 'Coordonnées de l’éditeur : voir les mentions légales du site.';
const SUPPORT = e.EDITEUR_EMAIL_SUPPORT || e.EDITEUR_EMAIL || 'l’adresse de support indiquée sur la page Contact du site';
const version = require('../package.json').version;
const PRODUIT = 'Aktum PDF';

const DOCUMENTS = [
  ['guide-administration.html', 'Guide-d-administration.pdf', 'Guide d’administration et de déploiement'],
  ['protection-des-donnees.html', 'Fiche-protection-des-donnees.pdf', 'Fiche de protection des données'],
  ['fiche-produit.html', 'Fiche-produit.pdf', 'Fiche produit'],
  ['support.html', 'Procedure-de-support.pdf', 'Procédure de support'],
];

(async () => {
  const sortie = path.resolve(process.argv[2] || path.join(__dirname, 'sortie'));
  fs.mkdirSync(sortie, { recursive: true });
  const nav = await chromium.launch(process.env.AKTUM_CHROMIUM ? { executablePath: process.env.AKTUM_CHROMIUM } : {});
  const remplacements = Object.assign({ VERSION: version, PRODUIT, COORDONNEES, SUPPORT }, DELAIS);
  for (const [source, nom, titre] of DOCUMENTS) {
    let html = fs.readFileSync(path.join(__dirname, source), 'utf8');
    html = html.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => { if (!(k in remplacements)) throw new Error(source + ' : « ' + m + ' » n’a pas de valeur'); return remplacements[k]; });
    // Écrit à côté de sa feuille de style, le temps d'imprimer.
    const tmp = path.join(__dirname, '.' + source);
    fs.writeFileSync(tmp, html);
    const page = await nav.newPage();
    const refusees = [];
    page.on('requestfailed', (r) => refusees.push(r.url()));
    await page.goto('file://' + tmp, { waitUntil: 'load' });
    const pied = `<div style="width:100%;padding:0 16mm;font:8pt 'Liberation Sans',Arial,sans-serif;color:#8892a0;display:flex;justify-content:space-between"><span>${PRODUIT} ${version} — ${titre}</span><span class="pageNumber"></span></div>`;
    await page.pdf({ path: path.join(sortie, nom), format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: pied, margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' } });
    await page.close();
    fs.unlinkSync(tmp);
    if (refusees.length) throw new Error(source + ' : ressources non chargées : ' + refusees.join(', '));
    console.log(nom + ' — ' + Math.round(fs.statSync(path.join(sortie, nom)).size / 1024) + ' Ko');
  }
  await nav.close();
  console.log('DOCUMENTS OK');
})().catch((err) => { console.error(err.message); process.exit(1); });
