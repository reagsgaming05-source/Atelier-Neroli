// Le nécessaire commun aux scénarios : fabriquer des PDF d'essai, ouvrir
// l'application, la piloter, et relire ce qu'elle a produit.
//
// Les PDF d'essai sont écrits à la main, octet par octet : rien à installer, et
// leur contenu est connu au caractère près — c'est ce qui permet d'affirmer
// qu'un mot a bien disparu d'un fichier caviardé.
const { test: base, expect: expectDeBase } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { spawnSync } = require('child_process');

// Un scénario qui n'affirme rien passe toujours : « expect » est donc compté, et un scénario réussi sans une seule affirmation échoue
// (voir le scénario type, plus bas). Le contrôle des erreurs de la page, que le scénario type fait de lui-même, n'en est pas une.
let affirmations = 0;
const expect = Object.assign((...a) => { affirmations++; return expectDeBase(...a); }, expectDeBase, {
  poll: (...a) => { affirmations++; return expectDeBase.poll(...a); },
  soft: (...a) => { affirmations++; return expectDeBase.soft(...a); },
});

// AKTUM_PAGE : une autre page construite (pour comparer deux versions : voir perf.spec.js).
const FICHIER = process.env.AKTUM_PAGE || path.join(__dirname, '..', 'aktum-pdf-hors-ligne.html');
// La page construite n'est pas dans le dépôt : elle se refait depuis la source.
if (!fs.existsSync(FICHIER)) {
  throw new Error('outils/aktum-pdf-hors-ligne.html manque.\n'
    + 'La suite teste la page construite, qui n\'est pas versionnée : lancez\n'
    + '  cd outils && npm ci && npm run libs && npm run build');
}
const PAGE = 'file://' + FICHIER;

// ---------------------------------------------------------------------------
//  Fabrication de PDF
// ---------------------------------------------------------------------------
// Les parenthèses et la barre oblique inverse ferment ou échappent une chaîne
// PDF : il faut les protéger. Le reste part en Latin-1, qui est le jeu WinAnsi
// pour tout ce qui nous intéresse (accents français compris).
const echapper = (t) => String(t).replace(/([\\()])/g, '\\$1');

// pages : un tableau de pages. Chaque page est soit une liste de morceaux de
// texte { x, y, taille, texte }, soit { morceaux, annots } où annots reçoit les
// numéros d'objet des pages et rend des dictionnaires d'annotation — de quoi
// poser un lien interne vers une page précise, ou une note de relecture.
// y part du bas, comme dans un PDF : 800 est en haut d'une A4.
function pdfDe(pages, opts) {
  opts = opts || {};
  const W = opts.largeur || 595, H = opts.hauteur || 842;
  const objets = [];
  const reserver = () => { objets.push(''); return objets.length; };
  const poser = (n, s2) => { objets[n - 1] = s2; };

  const nCatalogue = reserver();
  const nPages = reserver();
  const nPolice = reserver();
  poser(nPolice, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');

  // Premier temps : le flux et le numéro de chaque page, pour que les
  // annotations puissent se référer à n'importe laquelle d'entre elles.
  const plan = pages.map((brute) => {
    const page = Array.isArray(brute) ? { morceaux: brute } : (brute || {});
    const flux = (page.morceaux || []).map((m) =>
      'BT /F1 ' + (m.taille || 12) + ' Tf 1 0 0 1 ' + m.x + ' ' + m.y + ' Tm (' + echapper(m.texte) + ') Tj ET'
    ).join('\n');
    const nFlux = reserver();
    poser(nFlux, '<< /Length ' + Buffer.byteLength(flux, 'latin1') + ' >>\nstream\n' + flux + '\nendstream');
    return { page, nFlux, nPage: reserver() };
  });
  const refs = plan.map((e) => e.nPage);

  // Second temps : les dictionnaires de page, annotations comprises.
  plan.forEach((e) => {
    let annots = '';
    const liste = typeof e.page.annots === 'function' ? e.page.annots(refs) : (e.page.annots || []);
    if (liste.length) {
      const nums = liste.map((d) => { const n = reserver(); poser(n, d); return n + ' 0 R'; });
      annots = ' /Annots [' + nums.join(' ') + ']';
    }
    poser(e.nPage, '<< /Type /Page /Parent ' + nPages + ' 0 R /MediaBox [0 0 ' + (e.page.largeur || W) + ' ' + (e.page.hauteur || H) + ']'
      + ' /Resources << /Font << /F1 ' + nPolice + ' 0 R >> >> /Contents ' + e.nFlux + ' 0 R' + annots + ' >>');
  });
  poser(nCatalogue, '<< /Type /Catalog /Pages ' + nPages + ' 0 R >>');
  poser(nPages, '<< /Type /Pages /Kids [' + refs.map((n) => n + ' 0 R').join(' ') + '] /Count ' + pages.length + ' >>');

  let corps = '%PDF-1.4\n';
  const decalages = [];
  objets.forEach((o, i) => {
    decalages.push(Buffer.byteLength(corps, 'latin1'));
    corps += (i + 1) + ' 0 obj\n' + o + '\nendobj\n';
  });
  const xref = Buffer.byteLength(corps, 'latin1');
  corps += 'xref\n0 ' + (objets.length + 1) + '\n0000000000 65535 f \n'
    + decalages.map((d) => String(d).padStart(10, '0') + ' 00000 n \n').join('');
  corps += 'trailer\n<< /Size ' + (objets.length + 1) + ' /Root ' + nCatalogue + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(corps, 'latin1');
}

// Des pages vides, quand seul leur nombre compte.
const pdfVide = (n, opts) => pdfDe(Array.from({ length: n }, () => []), opts);

// Une page de texte ordinaire, avec un mot qu'on saura retrouver ou masquer.
function pdfTexte(lignes, opts) {
  return pdfDe([lignes.map((t, i) => ({ x: 70, y: 760 - i * 24, taille: 12, texte: t }))], opts);
}

// ---------------------------------------------------------------------------
//  Relire un PDF produit par l'application
// ---------------------------------------------------------------------------
const brut = (octets) => Buffer.from(octets).toString('latin1');
const compterPages = (octets) => (brut(octets).match(/\/Type\s*\/Page[^s]/g) || []).length;
const compterTournees = (octets, angle) => (brut(octets).match(new RegExp('/Rotate\\s+' + (angle || 90) + '\\b', 'g')) || []).length;
const estUnPdf = (octets) => brut(octets).slice(0, 5) === '%PDF-';

// Tout ce que porte le fichier, flux compressés compris. L'application
// réécrit les flux qu'elle retouche et les recompresse : sans décompression,
// on ne verrait rien et on croirait un mot effacé alors qu'il est toujours là.
function fluxDecompresses(octets) {
  const s = brut(octets);
  const morceaux = [s.replace(/(?<!end)stream\r?\n[\s\S]*?endstream/g, ' ')];
  const rx = /(?<!end)stream\r?\n/g;
  let m;
  while ((m = rx.exec(s))) {
    const debut = m.index + m[0].length;
    const fin = s.indexOf('endstream', debut);
    if (fin < 0) break;
    const donnees = Buffer.from(s.slice(debut, fin), 'latin1');
    try { morceaux.push(zlib.inflateSync(donnees).toString('latin1')); }
    catch (_) { morceaux.push(donnees.toString('latin1')); }
    rx.lastIndex = fin;
  }
  return morceaux.join('\n');
}

// Le texte porté par les opérateurs d'affichage, chaînes littérales « (…) »
// comme hexadécimales « <…> » — pdf-lib écrit en hexadécimal, et une ligne
// réécrite sur place aussi.
function texteDuFlux(octets) {
  const s = fluxDecompresses(octets);
  const out = [];
  const litteral = (t) => t.replace(/\\([nrtbf])/g, ' ').replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))).replace(/\\(.)/g, '$1');
  const hexa = (t) => {
    const h = t.replace(/[^0-9A-Fa-f]/g, '');
    let r = '';
    // Les polices standard écrivent un octet par lettre ; les polices
    // embarquées deux. On garde ce qui donne des caractères lisibles.
    for (let i = 0; i + 2 <= h.length; i += 2) r += String.fromCharCode(parseInt(h.substr(i, 2), 16));
    return r;
  };
  const rx = /\(((?:\\.|[^\\()])*)\)\s*(?:Tj|')|<([0-9A-Fa-f\s]*)>\s*Tj|\[([\s\S]*?)\]\s*TJ/g;
  let m;
  while ((m = rx.exec(s))) {
    if (m[1] != null) { out.push(litteral(m[1])); continue; }
    if (m[2] != null) { out.push(hexa(m[2])); continue; }
    const dedans = m[3] || '';
    let bout = '';
    const rx2 = /\(((?:\\.|[^\\()])*)\)|<([0-9A-Fa-f\s]*)>/g;
    let q;
    while ((q = rx2.exec(dedans))) bout += q[1] != null ? litteral(q[1]) : hexa(q[2]);
    out.push(bout);
  }
  return out.join(' ');
}

// Ce que l'utilisateur obtient en copiant-collant depuis le PDF : on le relit
// avec le pdf.js de la page elle-même, pas avec une lecture maison.
async function textesDuPdf(page, octets) {
  return page.evaluate(async (b64) => {
    const bin = atob(b64);
    const data = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
    const doc = await window.pdfjsLib.getDocument({ data }).promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const tc = await (await doc.getPage(i)).getTextContent();
      pages.push(tc.items.map((it) => it.str).join(''));
    }
    await doc.destroy();
    return pages;
  }, Buffer.from(octets).toString('base64'));
}
const texteDuPdf = async (page, octets) => (await textesDuPdf(page, octets)).join('\n');

// Les annotations d'un PDF produit, par page : ce qu'une visionneuse y voit
// vraiment, plutôt que des octets qui traînent sans être référencés.
async function annotationsDuPdf(page, octets) {
  return page.evaluate(async (b64) => {
    const bin = atob(b64);
    const data = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
    const doc = await window.pdfjsLib.getDocument({ data }).promise;
    const out = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const liste = await (await doc.getPage(i)).getAnnotations();
      out.push(liste.map((a) => ({
        type: a.subtype,
        contenu: (a.contentsObj && a.contentsObj.str) || a.contents || '',
        auteur: (a.titleObj && a.titleObj.str) || a.title || '',
      })));
    }
    await doc.destroy();
    return out;
  }, Buffer.from(octets).toString('base64'));
}

// Les liens internes et la page qu'ils visent réellement, après export.
async function liensDuPdf(page, octets) {
  return page.evaluate(async (b64) => {
    const bin = atob(b64);
    const data = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
    const doc = await window.pdfjsLib.getDocument({ data }).promise;
    const out = [];
    for (let i = 1; i <= doc.numPages; i++) {
      for (const a of await (await doc.getPage(i)).getAnnotations()) {
        if (a.subtype !== 'Link') continue;
        let d = a.dest;
        if (typeof d === 'string') { try { d = await doc.getDestination(d); } catch (_) { d = null; } }
        let vers = null;
        if (Array.isArray(d) && d[0]) {
          try { vers = (await doc.getPageIndex(d[0])) + 1; } catch (_) { vers = null; }
        }
        out.push({ depuis: i, vers, externe: !!a.url });
      }
    }
    await doc.destroy();
    return out;
  }, Buffer.from(octets).toString('base64'));
}

// ---------------------------------------------------------------------------
//  La barrière de format : tout PDF que l'application produit passe « qpdf --check »
// ---------------------------------------------------------------------------
// Code de sortie 0 : structure saine ; 3 : avertissements (le fichier s'ouvre, mais quelque chose cloche) ; 2 : erreurs. Les deux derniers
// font échouer le scénario, sauf deux cas assumés : un fichier chiffré dont le mot de passe d'ouverture n'est pas vide (qpdf ne peut pas le
// lire : le scénario de chiffrement le relit autrement), et un document que le scénario a volontairement abîmé (« tolere »).
let qpdfAbsent = false;
const verdictsDeFormat = [];
function barriereDeFormat(nom, octets, tolere) {
  if (!octets || octets.length < 8 || octets.subarray(0, 5).toString('latin1') !== '%PDF-') return;   // un zip, une image, un texte : pas un PDF
  if (qpdfAbsent || process.env.AKTUM_SANS_VERIFICATEURS) return;   // le poste Windows de la CI n'a pas qpdf : la barrière a joué sur Linux
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-qpdf-'));
  const f = path.join(dossier, 'sortie.pdf');
  try {
    fs.writeFileSync(f, octets);
    const r = spawnSync('qpdf', ['--check', f], { encoding: 'utf8' });
    if (r.error && r.error.code === 'ENOENT') {
      if (process.env.CI) throw new Error('qpdf est requis par la barrière de format (apt-get install qpdf) : il manque sur ce poste, la CI ne passe pas sans.');
      qpdfAbsent = true; console.warn('qpdf absent : la barrière de format ne joue pas sur ce poste.');
      return;
    }
    const sortie = String(r.stdout || '') + String(r.stderr || '');
    if (/invalid password|password/i.test(sortie) && r.status === 2) return;   // chiffré avec un mot de passe d'ouverture
    verdictsDeFormat.push({ nom, statut: r.status });
    if (r.status !== 0 && !tolere) {
      throw new Error('qpdf --check refuse « ' + nom + ' » (code ' + r.status + ') :\n' + sortie.split('\n').filter((l) => l.trim()).slice(0, 12).join('\n'));
    }
  } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
}

// ---------------------------------------------------------------------------
//  Piloter l'application
// ---------------------------------------------------------------------------
class App {
  constructor(page) { this.page = page; }

  // Le document d'exemple chargé au démarrage : six pages.
  async pretAvecExemple() {
    await this.page.waitForFunction(() => document.querySelectorAll('#lecture .feuille-vue, #pages .tile').length >= 6, null, { timeout: 60000 });
  }

  // Ouvrir un PDF fabriqué pour le test. Il remplace l'exemple tant que rien
  // n'a été modifié, exactement comme un fichier déposé par l'utilisateur.
  async ouvrir(nom, octets) {
    await this.page.setInputFiles('#file-input', { name: nom, mimeType: 'application/pdf', buffer: octets });
    await this.page.waitForFunction((n) => {
      const noms = Array.from(document.querySelectorAll('#doc-list .doc-name')).map((e) => e.textContent);
      return noms.some((t) => t.indexOf(n) >= 0);
    }, nom, { timeout: 60000 });
    await this.attendreRendu();
  }

  // Les vignettes et les feuilles suivent le document : on attend qu'elles
  // soient posées plutôt que de courir après un délai.
  async attendreRendu() {
    await this.page.waitForFunction(() => {
      const n = Number(document.querySelector('#summary').textContent.replace(/\D.*/, '')) || 0;
      if (!n) return false;
      const vue = document.querySelector('.vue-mode[aria-pressed="true"]').dataset.vue;
      return vue === 'lecture'
        ? document.querySelectorAll('#lecture .feuille-vue').length === n
        : document.querySelectorAll('#pages .tile').length === n;
    }, null, { timeout: 60000 });
  }

  async vue(laquelle) {
    await this.page.click('.vue-mode[data-vue="' + laquelle + '"]');
    await this.page.waitForFunction((v) => document.querySelector('.vue-mode[aria-pressed="true"]').dataset.vue === v, laquelle);
    await this.attendreRendu();
  }

  nbPages() { return this.page.evaluate(() => Number(document.querySelector('#summary').textContent.replace(/\D.*/, '')) || 0); }
  dernier() { return this.page.evaluate(() => document.querySelector('#last').textContent.trim()); }
  resume() { return this.page.evaluate(() => document.querySelector('#summary').textContent.trim()); }
  estModifie() { return this.page.evaluate(() => /modifié/.test(document.querySelector('#summary').textContent)); }

  // Sélectionner des vignettes (vue Organiser), en repartant de rien.
  async selectionner(...rangs) {
    await this.page.keyboard.press('Escape');            // on repart de rien
    await this.page.waitForFunction(() => document.querySelector('#selbar').hidden);
    for (const r of rangs) await this.page.click('#pages .tile:nth-child(' + r + ')');
    await this.page.waitForFunction((n) => document.querySelector('#sel-count').textContent.trim().startsWith(String(n)), rangs.length);
  }

  // Ce que l'application écrit : on récupère le fichier téléchargé — et chaque PDF récolté est jugé par qpdf, qui n'est pas notre code :
  // les scénarios relisent les fichiers avec le pdf.js de la page (juge et partie), la barrière de format les relit avec un autre lecteur.
  async recolter(action) {
    const [dl] = await Promise.all([this.page.waitForEvent('download', { timeout: 90000 }), action()]);
    const chemin = await dl.path();
    const octets = fs.readFileSync(chemin);
    barriereDeFormat(dl.suggestedFilename(), octets);
    return { nom: dl.suggestedFilename(), octets };
  }
  exporter() { return this.recolter(() => this.page.click('#btn-export')); }

  // Ouvrir un outil du volet latéral par son identifiant (voir toolGroups).
  async outil(id) {
    await this.page.click('#tab-tools');
    await this.page.click('[data-tool="' + id + '"]');
    await this.page.waitForSelector('.dialog', { state: 'visible' });
  }

  dialogue() { return this.page.locator('.dialog'); }
  async fermerDialogue() {
    await this.page.click('.dialog .dlg-head .x');
    await this.page.waitForSelector('.dialog', { state: 'detached' });
  }
}

// Un PDF dont les polices sont incorporées, fabriqué dans la page avec les polices du logiciel.
async function pdfEmbarque(page, ajouts) {
  const b64 = await page.evaluate(async (ajouts) => {
    const gunzip = async (id) => {
      const u = Uint8Array.from(atob(document.getElementById(id).textContent.trim()), (c) => c.charCodeAt(0));
      return new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    };
    const { PDFDocument, PDFName, PDFString, PDFHexString, rgb } = window.PDFLib;
    const d = await PDFDocument.create();
    d.registerFontkit(window.fontkit);
    const f = await d.embedFont(await gunzip('police-sans-r'), { subset: true });
    const n = ajouts.pages || 2;
    for (let i = 0; i < n; i++) {
      const p = d.addPage([595, 842]);
      p.drawText('Page ' + (i + 1) + ' — Zürich, Łódź', { x: 70, y: 760, size: 14, font: f });
      p.drawRectangle({ x: 70, y: 700, width: 120, height: 14, color: rgb(0.8, 0.1, 0.1) });
    }
    if (ajouts.javascript) {
      d.catalog.set(PDFName.of('OpenAction'), d.context.obj({ S: 'JavaScript', JS: PDFString.of('app.alert(1)') }));
      d.catalog.set(PDFName.of('Names'), d.context.obj({ JavaScript: d.context.obj({ Names: [PDFString.of('x'), d.context.obj({ S: 'JavaScript', JS: PDFString.of('1') })] }) }));
    }
    if (ajouts.piece) {
      const flux = d.context.stream('pièce jointe', { Type: 'EmbeddedFile' });
      const spec = d.context.obj({ Type: 'Filespec', F: PDFString.of('note.txt'), EF: d.context.obj({ F: d.context.register(flux) }) });
      const noms = d.catalog.lookup(PDFName.of('Names')) || d.context.obj({});
      noms.set(PDFName.of('EmbeddedFiles'), d.context.obj({ Names: [PDFString.of('note.txt'), d.context.register(spec)] }));
      d.catalog.set(PDFName.of('Names'), noms);
    }
    if (ajouts.lien) {
      const a = d.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [70, 700, 190, 714], Border: [0, 0, 0], A: d.context.obj({ S: 'URI', URI: PDFString.of('https://example.org/') }) });
      d.getPage(0).node.set(PDFName.of('Annots'), d.context.obj([d.context.register(a)]));
    }
    if (ajouts.formulaire) {
      const form = d.getForm();
      const t = form.createTextField('Nom');
      t.addToPage(d.getPage(0), { x: 70, y: 600, width: 200, height: 20, font: f });
      t.setText('Müller');
    }
    const o = await d.save();
    let s = ''; for (let i = 0; i < o.length; i++) s += String.fromCharCode(o[i]);
    return btoa(s);
  }, ajouts || {});
  return Buffer.from(b64, 'base64');
}


// ---------------------------------------------------------------------------
//  La couverture : ce que les scénarios exécutent du code de l'application
// ---------------------------------------------------------------------------
// Le programme de l'application est un seul <script> de la page construite. V8 dit, pour chaque plage d'octets de ce script, combien de
// fois elle a été exécutée ; on garde les plages exécutées, scénario par scénario, et couverture.js les additionne et les rapporte aux
// modules de outils/src/.
function enregistrerLaCouverture(entrees) {
  const dossier = path.join(__dirname, 'couverture');
  fs.mkdirSync(dossier, { recursive: true });
  for (const e of entrees) {
    if (!e.source || e.source.indexOf('APP_CONSTRUCTION') < 0) continue;   // les bibliothèques embarquées n'en sont pas
    const exec = new Uint8Array(e.source.length);
    // Les plages sont emboîtées, de la plus large à la plus étroite : la plus étroite dit ce qui s'est passé à cet endroit.
    for (const fn of e.functions) for (const r of fn.ranges) exec.fill(r.count > 0 ? 1 : 0, r.startOffset, r.endOffset);
    const plages = [];
    for (let i = 0; i < exec.length; i++) {
      if (!exec[i]) continue;
      let j = i; while (j < exec.length && exec[j]) j++;
      plages.push([i, j]); i = j;
    }
    fs.writeFileSync(path.join(dossier, process.pid + '-' + Date.now() + '-' + Math.floor(Math.random() * 1e6) + '.json'),
      JSON.stringify({ longueur: e.source.length, empreinte: e.source.slice(0, 200), plages }));
  }
}

// ---------------------------------------------------------------------------
//  Le scénario type : une page ouverte, et aucune erreur JavaScript tolérée
// ---------------------------------------------------------------------------
const test = base.extend({
  // Un scénario réussi sans une seule affirmation ne prouve rien : il échoue.
  garde: [async ({}, use, testInfo) => {
    affirmations = 0;
    await use();
    if (testInfo.status === 'passed' && affirmations === 0) throw new Error('ce scénario n\'affirme rien (aucun expect) : il passerait quoi qu\'il arrive');
  }, { auto: true }],
  app: async ({ page }, use) => {
    const erreurs = [];
    page.on('pageerror', (e) => erreurs.push(String(e.message)));
    // « npm run couverture » : ce que la suite exécute du code de l'application, relevé par le navigateur (voir couverture.js).
    if (process.env.AKTUM_COUVERTURE) await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await page.goto(PAGE);
    await page.waitForSelector('#app-toolbar', { state: 'visible', timeout: 60000 });
    const app = new App(page);
    await use(app);
    if (process.env.AKTUM_COUVERTURE) { try { enregistrerLaCouverture(await page.coverage.stopJSCoverage()); } catch (e) { /* la page s'est fermée avant la fin du test */ } }
    // Une exception non rattrapée passe souvent inaperçue à l'écran : ici elle
    // fait échouer le scénario.
    expectDeBase(erreurs, 'la page n\'a levé aucune exception').toEqual([]);
  },
});

module.exports = {
  test, expect, App, PAGE, barriereDeFormat,
  pdfDe, pdfVide, pdfTexte,
  pdfEmbarque, compterPages, compterTournees, estUnPdf, texteDuFlux, texteDuPdf, textesDuPdf, annotationsDuPdf, liensDuPdf, fluxDecompresses, brut,
};
