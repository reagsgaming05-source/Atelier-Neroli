// Décompte DGEO dans Compta Blonay (relecture d'ergonomie) : ce que la passerelle apprend à la
// page de Décompte DGEO et au volet « Formulaire du dossier ».
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { PDFDocument } = require('pdf-lib');
const D = require('../src/dossier.js');
const X = require('../desktop/dgeo-proxy.js');

test('volet : « justificatifs comptés » compte ceux qui le sont, pas ceux qui ont été lus', () => {
  const s = X.summarizeAnalysis({ id: 'a', total: 55.9, pieces: [{ include: true }, { include: true }, { include: false }, { include: false }, { include: true }], warnings: ['[calcul] Aucun·e enseignant·e titré·e dans les effectifs.'] }, 'd.pdf');
  assert.equal(s.pieces, 3, 'le volet affichait 5 pour 3 justificatifs comptés');
  assert.equal(s.piecesLues, 5);
  assert.deepEqual(s.warnings, ['Aucun·e enseignant·e titré·e dans les effectifs.'], 'préfixe technique « [calcul] » retiré');
});

test('dossier sans texte : la première page retirée est dite « supposée »', async () => {
  const blank = await PDFDocument.create(); blank.addPage([595, 842]); blank.addPage([595, 842]);
  const res = await D.clean(Buffer.from(await blank.save()), { skipFirst: true });
  assert.deepEqual(res.removed, [1]);
  assert.equal(res.supposee, true, 'retirée sans avoir été reconnue : la page DGEO doit le dire');
});

async function serveurDgeo(seen) {
  const target = http.createServer((req, res) => {
    const chunks = []; req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      seen.push({ method: req.method, url: req.url, body });
      res.writeHead(200, { 'content-type': 'application/json' });
      if (req.url.startsWith('/api/analyse')) {
        const mp = X.parseMultipart(body, req.headers['content-type']);
        res.end(JSON.stringify({ id: 'abc123abc123', file: mp.parts.find((p) => p.name === 'file').data.toString(), total: 55.9, pieces: [{ include: true }], pages: [{ number: 1, kind: 'pieces', url: '/api/pages/abc123abc123/1' }] }));
      } else if (req.method === 'GET' && req.url.startsWith('/api/dossiers/')) {
        res.end(JSON.stringify({ version: 1, dossier: { id: 'abc123abc123', filename: 'BER120626.pdf', total: 47.85, pieces: [{ include: true }, { include: false }] }, retouches: {} }));
      } else res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise((r) => target.listen(0, '127.0.0.1', r));
  return target;
}
const envoyer = (port, method, path, body, ct) => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port, method, path, headers: body ? { 'content-type': ct, 'content-length': body.length } : {}, agent: false }, (r) => { const c = []; r.on('data', (d) => c.push(d)); r.on('end', () => resolve({ status: r.statusCode, body: Buffer.concat(c).toString() })); });
  req.on('error', reject); req.end(body || undefined);
});
const multipart = (champs) => {
  const b = 'XYZ';
  const parts = champs.map(([nom, val, fichier]) => `--${b}\r\nContent-Disposition: form-data; name="${nom}"${fichier ? `; filename="${fichier}"\r\nContent-Type: application/pdf` : ''}\r\n\r\n${val}\r\n`).join('');
  return { body: Buffer.from(`${parts}--${b}--\r\n`), ct: `multipart/form-data; boundary=${b}` };
};

test('passerelle : la page de Décompte DGEO apprend quelle page a été retirée, et peut tout garder', async () => {
  const seen = []; const target = await serveurDgeo(seen);
  const nettoyages = []; const infos = [];
  const proxy = await X.startProxy({ target: `http://127.0.0.1:${target.address().port}/`, log: () => {},
    clean: async (bytes) => { nettoyages.push(bytes.toString()); return { bytes: Buffer.from('SANS-PAGE-1'), removed: [1], total: 7, reason: 'première page retirée (dossier scanné sans texte lisible)', supposee: true }; },
    onCleaned: (i) => infos.push(i) });
  try {
    const m = multipart([['file', 'ORIGINAL', 'BER120626.pdf']]);
    const a = JSON.parse((await envoyer(proxy.port, 'POST', '/api/analyse', m.body, m.ct)).body);
    assert.equal(a.file, 'SANS-PAGE-1');
    assert.deepEqual(a.pages_retirees, { pages: [1], total: 7, supposee: true }, 'la page DGEO ignorait le retrait (seule une note masquée de la barre latérale le disait)');
    // « Réanalyser avec toutes les pages » : rien n'est retiré
    const m2 = multipart([['file', 'ORIGINAL', 'BER120626.pdf'], ['garder_toutes_les_pages', '1']]);
    const b = JSON.parse((await envoyer(proxy.port, 'POST', '/api/analyse', m2.body, m2.ct)).body);
    assert.equal(b.file, 'ORIGINAL');
    assert.equal(b.pages_retirees, undefined);
    assert.equal(nettoyages.length, 1, 'le nettoyage ne doit pas tourner');
    assert.deepEqual(infos.map((i) => i.removed), [[1], []]);
  } finally {
    await proxy.close();
    if (target.closeAllConnections) target.closeAllConnections();
    await new Promise((r) => target.close(r));
  }
});

test('passerelle : le volet suit le décompte enregistré ou repris, pas seulement l\'analyse', async () => {
  const seen = []; const target = await serveurDgeo(seen);
  const suivis = [];
  const proxy = await X.startProxy({ target: `http://127.0.0.1:${target.address().port}/`, log: () => {}, onSaved: (i) => suivis.push(i) });
  try {
    const etat = Buffer.from(JSON.stringify({ version: 1, dossier: { id: 'abc123abc123', filename: 'BER120626.pdf', total: 60.9, pieces: [{ include: true }, { include: true }, { include: false }] }, retouches: {} }));
    const r = await envoyer(proxy.port, 'POST', '/api/dossiers/abc123abc123', etat, 'text/plain;charset=UTF-8');
    assert.equal(r.status, 200);
    assert.ok(seen[0].body.equals(etat), 'état transmis tel quel');
    assert.equal(suivis.length, 1, 'le volet gardait la part de l\'État figée à l\'analyse');
    assert.equal(suivis[0].total, 60.9);
    assert.equal(suivis[0].pieces, 2);
    assert.equal(suivis[0].filename, 'BER120626.pdf');
    await envoyer(proxy.port, 'GET', '/api/dossiers/abc123abc123');
    assert.equal(suivis.length, 2);
    assert.equal(suivis[1].total, 47.85, 'décompte repris : le volet passe à lui');
    await envoyer(proxy.port, 'GET', '/api/dossiers');
    assert.equal(suivis.length, 2, 'la liste des décomptes n\'est pas un décompte');
  } finally {
    await proxy.close();
    if (target.closeAllConnections) target.closeAllConnections();
    await new Promise((r) => target.close(r));
  }
});
