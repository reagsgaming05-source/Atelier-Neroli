const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const R = require('../src/registre.js');
const F = require('../src/pdfpiece.js');
const D = require('../src/dossier.js');
const X = require('../desktop/dgeo-proxy.js');

async function dossierPdf() {
  // page 1 : pièce comptable (fiche de l'application) ; pages 2-3 : formulaire et ticket
  const reg = R.emptyRegister(2026, { openingAmount: 100 });
  const p = R.newPiece(reg);
  Object.assign(p, { no: 7, type: 'DECOMPTE', objet: "Course d'école", classe: '5P/3', periode: '12.06.2026', detail: 'Lausanne', personne: 'A. Berger', montant: 143.95, sens: 'credit', compte: '51000.3662.00', date: '2026-06-20' });
  p.libelle = R.composeLibelle(p); R.upsertPiece(reg, p);
  const fiche = await F.buildPdf([p], reg, () => null);
  const doc = await PDFDocument.load(fiche.bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const f = doc.addPage([595.28, 841.89]); f.drawText("Type d'activite : course d'ecole - Classe participante : 5P/3", { x: 50, y: 760, size: 11, font });
  const t = doc.addPage([595.28, 841.89]); t.drawText('CFF Lausanne - 2 x Prix entier CHF 12.20 - Total CHF 24.40', { x: 50, y: 760, size: 11, font });
  return Buffer.from(await doc.save());
}

test('dossier DGEO : la page « PIÈCE COMPTABLE » est retirée, le reste transmis', async () => {
  const bytes = await dossierPdf();
  const pages = await D.inspect(bytes);
  assert.deepEqual(pages.map((p) => p.form), [true, false, false]);
  const res = await D.clean(bytes, { skipFirst: true });
  assert.deepEqual(res.removed, [1]);
  assert.equal(res.total, 3);
  const out = await PDFDocument.load(res.bytes);
  assert.equal(out.getPageCount(), 2);
  // rien à retirer : octets inchangés
  const again = await D.clean(res.bytes, { skipFirst: true });
  assert.deepEqual(again.removed, []);
  assert.equal(again.bytes, res.bytes);
  // dossier sans texte : première page retirée seulement si demandé
  const blank = await PDFDocument.create(); blank.addPage([595, 842]); blank.addPage([595, 842]);
  const blankBytes = Buffer.from(await blank.save());
  assert.deepEqual((await D.clean(blankBytes, { skipFirst: true })).removed, [1]);
  assert.deepEqual((await D.clean(blankBytes, { skipFirst: false })).removed, []);
  // une seule page, pièce comptable : transmise telle quelle
  const only = await D.clean((await F.buildPdf([R.normalizePiece({ no: 1, type: 'REMBOURSEMENT', montant: 5, sens: 'credit', compte: '51000.3662.00', personne: 'A. Berger', date: '2026-01-01' })], R.emptyRegister(2026), () => null)).bytes, { skipFirst: true });
  assert.deepEqual(only.removed, []);
});

test('multipart : découpage et réécriture fidèles', () => {
  const boundary = '----WebKitFormBoundaryTEST';
  const file = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x0d, 0x0a, 0x2d, 0x2d, 0x00, 0xff, 0x0d, 0x0a]);
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="dossier.pdf"\r\nContent-Type: application/pdf\r\n\r\n`), file,
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="type_activite"\r\n\r\ncourse\r\n--${boundary}--\r\n`)]);
  const mp = X.parseMultipart(body, `multipart/form-data; boundary=${boundary}`);
  assert.equal(mp.parts.length, 2);
  assert.equal(mp.parts[0].filename, 'dossier.pdf');
  assert.equal(mp.parts[0].contentType, 'application/pdf');
  assert.ok(mp.parts[0].data.equals(file));
  assert.equal(mp.parts[1].data.toString(), 'course');
  const rebuilt = X.buildMultipart(mp.boundary, mp.parts);
  assert.ok(rebuilt.equals(body));
});

test('passerelle : /api/analyse nettoyé, le reste transmis tel quel', async () => {
  const seen = [];
  const target = http.createServer((req, res) => {
    const chunks = []; req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      seen.push({ method: req.method, url: req.url, length: body.length, ct: req.headers['content-type'] || '' });
      if (req.url.startsWith('/api/analyse')) {
        const mp = X.parseMultipart(body, req.headers['content-type']);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ file: mp.parts.find((p) => p.name === 'file').data.toString(), type: mp.parts.find((p) => p.name === 'type_activite').data.toString(), id: 'abc123', activite: 'Labyrinthe aventure', classe: '3P2', enseignant: 'L. Berger', date_debut: '16.06.26', effectifs: { eleves: 21, enseignants_dgeo: 1, autres: 1 }, form_expenses: [{ categorie: 'Transport', descriptif: 'train', pieces: '1', paye_commune: 345 }], form_total: 650, total: 24.4, pages: [{ number: 1, kind: 'form', url: '/api/pages/abc123/1', width: 1000, height: 1400 }, { number: 2, kind: 'pieces', url: '/api/pages/abc123/2' }] }));
      } else { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, url: req.url, body: body.toString() })); }
    });
  });
  await new Promise((r) => target.listen(0, '127.0.0.1', r));
  const cleaned = []; const analysed = [];
  const proxy = await X.startProxy({ target: `http://127.0.0.1:${target.address().port}/`, clean: async (bytes, name) => ({ bytes: Buffer.from('CLEAN'), removed: [1], total: 3, reason: `test ${name}` }), onCleaned: (i) => cleaned.push(i), onAnalysed: (i) => analysed.push(i), log: () => {} });
  const post = (path, body, ct) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: proxy.port, method: 'POST', path, headers: { 'content-type': ct, 'content-length': body.length }, agent: false }, (r) => { const c = []; r.on('data', (d) => c.push(d)); r.on('end', () => resolve({ status: r.statusCode, body: Buffer.concat(c).toString() })); });
    req.on('error', reject); req.end(body);
  });
  const boundary = 'XYZ';
  const body = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="d.pdf"\r\nContent-Type: application/pdf\r\n\r\nORIGINAL\r\n--${boundary}\r\nContent-Disposition: form-data; name="type_activite"\r\n\r\ncamp\r\n--${boundary}--\r\n`);
  const a = await post('/api/analyse', body, `multipart/form-data; boundary=${boundary}`);
  assert.equal(a.status, 200);
  assert.equal(JSON.parse(a.body).file, 'CLEAN', 'fichier nettoyé transmis');
  assert.equal(cleaned.length, 1);
  assert.deepEqual(cleaned[0].removed, [1]);
  assert.equal(analysed.length, 1);
  assert.equal(analysed[0].id, 'abc123');
  assert.equal(analysed[0].filename, 'd.pdf');
  assert.equal(analysed[0].activite, 'Labyrinthe aventure');
  assert.equal(analysed[0].effectifs.eleves, 21);
  assert.equal(analysed[0].form_expenses[0].paye_commune, 345);
  assert.deepEqual(analysed[0].pages.map((p) => p.kind), ['form', 'pieces']);
  assert.equal(JSON.parse(a.body).type, 'camp', 'réponse transmise intacte');
  const b = await post('/api/recompute', Buffer.from('{"x":1}'), 'application/json');
  assert.deepEqual(JSON.parse(b.body), { ok: true, url: '/api/recompute', body: '{"x":1}' });
  const g = await new Promise((resolve, reject) => http.get(`http://127.0.0.1:${proxy.port}/api/health`, { agent: false }, (r) => { const c = []; r.on('data', (d) => c.push(d)); r.on('end', () => resolve(JSON.parse(Buffer.concat(c).toString()))); }).on('error', reject));
  assert.equal(g.url, '/api/health');
  await proxy.close();
  if (target.closeAllConnections) target.closeAllConnections();
  await new Promise((r) => target.close(r));
});

/* ------------------------------------------------------------------ */
/* Audit : une page ordinaire ne doit pas passer pour une pièce comptable */
/* ------------------------------------------------------------------ */

test("une page qui emploie les mots « somme », « doit » et « avoir » n'est pas retirée du dossier", async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  // formulaire de couverture de Blonay : les trois mots y figurent dans des phrases ordinaires
  const p = doc.addPage([595.28, 841.89]);
  const lignes = [
    "Decompte d'une course d'ecole - Classe participante : 5P/3",
    "La somme versee par la commune doit figurer ci-dessous.",
    "L'enseignant doit avoir joint tous les justificatifs.",
    'Budget accorde : CHF 600.00 - Total des depenses : CHF 143.95',
  ];
  lignes.forEach((l, i) => p.drawText(l, { x: 50, y: 760 - i * 20, size: 11, font }));
  const bytes = Buffer.from(await doc.save());
  const pages = await D.inspect(bytes);
  assert.deepEqual(pages.map((x) => x.form), [false], 'page prise à tort pour une pièce comptable');
  const res = await D.clean(bytes, { skipFirst: true });
  assert.deepEqual(res.removed, [], 'le formulaire de couverture ne doit pas être retiré');
});
