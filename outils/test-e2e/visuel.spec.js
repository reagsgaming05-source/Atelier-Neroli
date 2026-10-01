// La régression visuelle : trois documents témoins — une lettre avec accents, un tableau, une page scannée — et
// deux vues chacun (la feuille en lecture, la vignette en organisation) font six références, rangées dans
// references/. Chaque scénario rend le document et le compare à sa référence ; toute différence au-delà du
// bruit de rendu fait échouer la chaîne, et se regarde à l'œil dans le rapport.
//
// Les documents sont fabriqués avec les polices du logiciel (incorporées) et des formes dessinées, jamais avec
// une police du système : le rendu ne dépend donc pas du poste. Mais le lissage des lettres, lui, est celui du
// Chromium qui les dessine : deux machines n'en donnent pas le même contour (un à deux pour cent des pixels, au
// bord des lettres). Les références du poste de développement sont donc dans references/, et celles de la chaîne
// d'intégration (variable CI) dans references-ci/, chacune écrite par le Chromium qui s'en sert. À refaire quand
// Playwright change de Chromium : AKTUM_REFERENCES=ecrire les réécrit.
//
// Sur la chaîne, rien ne se récupère facilement d'un fichier : quand une référence manque ou diffère, l'image
// obtenue est écrite dans le journal (entre REFERENCE-OBTENUE et FIN-REFERENCE, en base64) pour être relue à
// l'œil puis versionnée dans references-ci/. `node test-e2e/references-du-journal.js journal.txt` les en extrait.
//
//   AKTUM_REFERENCES=ecrire npx playwright test visuel.spec.js
const fs = require('fs');
const path = require('path');
const { test, expect } = require('./aide');

const DOSSIER = path.join(__dirname, process.env.CI ? 'references-ci' : 'references');
const ECRIRE = process.env.AKTUM_REFERENCES === 'ecrire';

// Un document témoin, fabriqué dans la page avec pdf-lib et les polices du logiciel.
async function fabriquer(page, quoi) {
  const b64 = await page.evaluate(async (quoi) => {
    const gunzip = async (id) => {
      const u = Uint8Array.from(atob(document.getElementById(id).textContent.trim()), (c) => c.charCodeAt(0));
      return new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    };
    const { PDFDocument, rgb } = window.PDFLib;
    const d = await PDFDocument.create();
    d.registerFontkit(window.fontkit);
    const reg = await d.embedFont(await gunzip('police-sans-r'), { subset: true });
    const gras = await d.embedFont(await gunzip('police-sans-b'), { subset: true });
    const p = d.addPage([595, 842]);
    if (quoi === 'lettre') {
      p.drawText('Commune de Test', { x: 60, y: 780, size: 20, font: gras, color: rgb(0.1, 0.25, 0.55) });
      p.drawLine({ start: { x: 60, y: 770 }, end: { x: 535, y: 770 }, thickness: 1.5, color: rgb(0.1, 0.25, 0.55) });
      p.drawText('Décision n° 42 — séance du 12 mars', { x: 60, y: 735, size: 14, font: gras });
      const lignes = ['Éléments à vérifier : Müller, Zürich, Škoda, Łódź, élève, naïve, œuvre.', 'Le Conseil communal, réuni à Vevey, décide :', '1. d’approuver le budget de CHF 1 250 000 ;', '2. de transmettre le dossier à la Préfecture ;', '3. de publier la décision dans la Feuille des avis officiels.'];
      lignes.forEach((l, i) => p.drawText(l, { x: 60, y: 700 - i * 22, size: 11, font: reg }));
      p.drawRectangle({ x: 60, y: 520, width: 200, height: 40, borderColor: rgb(0.8, 0.1, 0.1), borderWidth: 1.2 });
      p.drawText('Approuvé — Le syndic', { x: 70, y: 535, size: 11, font: gras, color: rgb(0.8, 0.1, 0.1) });
    } else if (quoi === 'tableau') {
      p.drawText('Récapitulatif des dépenses', { x: 60, y: 780, size: 16, font: gras });
      const col = [60, 250, 350, 450, 535];
      const lignes = [['Poste', 'Budget', 'Réel', 'Écart'], ['Voirie', '120 000', '118 400', '-1 600'], ['École', '310 000', '322 150', '+12 150'], ['Culture', '45 000', '44 980', '-20'], ['Total', '475 000', '485 530', '+10 530']];
      lignes.forEach((l, r) => {
        const y = 740 - r * 28;
        if (r === 0) p.drawRectangle({ x: 60, y: y - 6, width: 475, height: 24, color: rgb(0.88, 0.92, 0.98) });
        l.forEach((c, k) => p.drawText(c, { x: col[k] + 6, y, size: 11, font: r === 0 || r === 4 ? gras : reg }));
      });
      for (let r = 0; r <= 5; r++) p.drawLine({ start: { x: 60, y: 758 - r * 28 }, end: { x: 535, y: 758 - r * 28 }, thickness: 0.8, color: rgb(0.3, 0.3, 0.3) });
      col.forEach((x) => p.drawLine({ start: { x, y: 758 }, end: { x, y: 618 }, thickness: 0.8, color: rgb(0.3, 0.3, 0.3) }));
    } else {
      // un « scan » : une image, des formes et un dégradé, sans aucun texte (donc sans police)
      const cv = document.createElement('canvas'); cv.width = 1000; cv.height = 1414;
      const x = cv.getContext('2d');
      x.fillStyle = '#f4f1e8'; x.fillRect(0, 0, 1000, 1414);
      const g = x.createLinearGradient(0, 0, 1000, 0); g.addColorStop(0, '#d8c9a8'); g.addColorStop(1, '#f4f1e8');
      x.fillStyle = g; x.fillRect(0, 0, 1000, 120);
      x.fillStyle = '#222'; for (let i = 0; i < 24; i++) x.fillRect(110, 220 + i * 44, 780 - ((i * 97) % 260), 14);
      x.strokeStyle = '#444'; x.lineWidth = 6; x.strokeRect(80, 160, 840, 1120);
      x.beginPath(); x.arc(780, 1180, 90, 0, Math.PI * 2); x.strokeStyle = '#a02020'; x.lineWidth = 8; x.stroke();
      const img = await d.embedPng(cv.toDataURL('image/png'));
      p.drawImage(img, { x: 0, y: 0, width: 595, height: 842 });
    }
    const o = await d.save();
    let s = ''; for (let i = 0; i < o.length; i += 8192) s += String.fromCharCode.apply(null, o.subarray(i, i + 8192));
    return btoa(s);
  }, quoi);
  return Buffer.from(b64, 'base64');
}

// L'image obtenue, dans le journal de la chaîne : on n'a pas toujours le moyen de récupérer un fichier de son disque.
const journaliser = (nom, dataUrl) => {
  const b64 = dataUrl.split(',')[1];
  const lignes = ['REFERENCE-OBTENUE ' + nom];
  for (let i = 0; i < b64.length; i += 160) lignes.push(b64.slice(i, i + 160));
  lignes.push('FIN-REFERENCE');
  console.log(lignes.join('\n'));
};

// Ce que l'application montre : le canvas de la feuille (lecture) ou l'image de la vignette (organisation), en PNG.
const capturer = (page, vue) => page.evaluate(async (vue) => {
  if (vue === 'lecture') {
    const cv = document.querySelector('#lecture .feuille-vue canvas');
    return cv.toDataURL('image/png');
  }
  const img = document.querySelector('#pages .tile img');
  await img.decode();
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
}, vue);

// La différence entre deux PNG, dans la page : la part des pixels dont un canal s'écarte de plus de `seuil`.
const comparer = (page, actuel, reference, seuil) => page.evaluate(async ([a, r, seuil]) => {
  const charger = (u) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image illisible')); i.src = u; });
  const [ia, ir] = await Promise.all([charger(a), charger(r)]);
  if (ia.width !== ir.width || ia.height !== ir.height) return { taille: [ia.width, ia.height, ir.width, ir.height] };
  const lire = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
  const da = lire(ia), dr = lire(ir);
  let diff = 0;
  for (let k = 0; k < da.length; k += 4) if (Math.abs(da[k] - dr[k]) > seuil || Math.abs(da[k + 1] - dr[k + 1]) > seuil || Math.abs(da[k + 2] - dr[k + 2]) > seuil) diff++;
  return { diff, total: da.length / 4 };
}, [actuel, reference, seuil]);

for (const quoi of ['lettre', 'tableau', 'scan']) {
  for (const vue of ['lecture', 'organiser']) {
    test('référence visuelle : ' + quoi + ', vue ' + (vue === 'lecture' ? 'Lecture' : 'Organiser'), async ({ app, page }) => {
      test.setTimeout(120000);
      await app.ouvrir(quoi + '.pdf', await fabriquer(page, quoi));
      if (vue === 'organiser') {
        await app.vue('organiser');
        await page.waitForFunction(() => { const i = document.querySelector('#pages .tile img'); return i && i.complete && i.naturalWidth > 20; }, null, { timeout: 60000 });
      } else {
        await page.waitForFunction(() => document.querySelector('#lecture .feuille-vue .attente[hidden]'), null, { timeout: 60000 });
      }
      const actuel = await capturer(page, vue);
      const fichier = path.join(DOSSIER, quoi + '-' + vue + '.png');
      if (ECRIRE || !fs.existsSync(fichier)) {
        if (process.env.CI) journaliser(path.basename(fichier), actuel);
        fs.mkdirSync(DOSSIER, { recursive: true });
        fs.writeFileSync(fichier, Buffer.from(actuel.split(',')[1], 'base64'));
        test.info().annotations.push({ type: 'référence', description: 'écrite : ' + path.basename(fichier) });
        if (!ECRIRE) throw new Error('la référence ' + path.basename(fichier) + ' n\'existait pas : elle vient d\'être écrite, relisez-la à l\'œil et versionnez-la');
        return;
      }
      const reference = 'data:image/png;base64,' + fs.readFileSync(fichier).toString('base64');
      // la vignette est un JPEG réduit : plus de bruit que la feuille
      const r = await comparer(page, actuel, reference, vue === 'lecture' ? 40 : 70);
      expect(r.taille, 'les dimensions du rendu ont changé').toBeUndefined();
      const part = r.diff / r.total;
      console.log(quoi + ' / ' + vue + ' : ' + r.diff + ' pixels sur ' + r.total + ' diffèrent (' + (part * 100).toFixed(3) + ' %)');
      if (part > (vue === 'lecture' ? 0.0015 : 0.01)) {
        if (process.env.CI) journaliser(path.basename(fichier), actuel);
        fs.writeFileSync(test.info().outputPath(quoi + '-' + vue + '-obtenu.png'), Buffer.from(actuel.split(',')[1], 'base64'));
      }
      expect(part, 'part des pixels qui diffèrent de la référence ' + path.basename(fichier)).toBeLessThan(vue === 'lecture' ? 0.0015 : 0.01);
    });
  }
}
