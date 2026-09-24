/*
 * Passerelle locale placée devant Décompte DGEO. La page de Décompte DGEO parle à cette passerelle,
 * qui transmet tout au serveur de Décompte DGEO tel quel, sauf l'envoi du dossier PDF à analyser
 * (POST /api/analyse) : le fichier est d'abord nettoyé (les pages « PIÈCE COMPTABLE » de la caisse,
 * qui ouvrent le dossier scanné, sont retirées, voir src/dossier.js), puis transmis. Décompte DGEO
 * lui-même n'est pas modifié. Aucune dépendance : multipart lu et réécrit ici.
 */
const http = require('http');

/** Découpe un corps multipart/form-data : { boundary, parts: [{ name, filename, contentType, data }] }. */
function parseMultipart(body, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!m) throw new Error('multipart sans boundary');
  const boundary = (m[1] || m[2]).trim();
  const marker = Buffer.from(`--${boundary}`);
  const parts = [];
  let pos = body.indexOf(marker);
  while (pos >= 0) {
    let start = pos + marker.length;
    if (body[start] === 0x2d && body[start + 1] === 0x2d) break; // « -- » : fin
    if (body[start] === 0x0d && body[start + 1] === 0x0a) start += 2;
    const headerEnd = body.indexOf('\r\n\r\n', start);
    if (headerEnd < 0) break;
    const headers = body.slice(start, headerEnd).toString('utf8');
    const next = body.indexOf(marker, headerEnd + 4);
    if (next < 0) break;
    let dataEnd = next;
    if (body[dataEnd - 2] === 0x0d && body[dataEnd - 1] === 0x0a) dataEnd -= 2;
    const nameM = /name="([^"]*)"/i.exec(headers);
    const fileM = /filename="([^"]*)"/i.exec(headers);
    const ctM = /content-type:\s*([^\r\n]+)/i.exec(headers);
    parts.push({ name: nameM ? nameM[1] : '', filename: fileM ? fileM[1] : null, contentType: ctM ? ctM[1].trim() : null, data: body.slice(headerEnd + 4, dataEnd) });
    pos = next;
  }
  return { boundary, parts };
}

/** Réécrit un corps multipart/form-data. */
function buildMultipart(boundary, parts) {
  const chunks = [];
  for (const p of parts) {
    let h = `--${boundary}\r\nContent-Disposition: form-data; name="${p.name}"`;
    if (p.filename != null) h += `; filename="${p.filename}"`;
    h += '\r\n';
    if (p.contentType) h += `Content-Type: ${p.contentType}\r\n`;
    h += '\r\n';
    chunks.push(Buffer.from(h, 'utf8'), Buffer.from(p.data), Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(chunks);
}

/** Résumé d'un dossier analysé par Décompte DGEO (réponse de /api/analyse), pour l'affichage du formulaire. */
function summarizeAnalysis(d, filename) {
  const str = (v) => (v == null ? '' : String(v)).slice(0, 300);
  const num = (v) => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v));
  const eff = d.effectifs && typeof d.effectifs === 'object' ? d.effectifs : {};
  const pieces = Array.isArray(d.pieces) ? d.pieces : [];
  return {
    id: str(d.id), filename: str(filename), numero: str(d.numero), type_activite: d.type_activite === 'camp' ? 'camp' : 'course', type_activite_texte: str(d.type_activite_texte),
    activite: str(d.activite), classe: str(d.classe), enseignant: str(d.enseignant), telephone: str(d.telephone), date_debut: str(d.date_debut), date_fin: str(d.date_fin), budget: num(d.budget),
    effectifs: { eleves: num(eff.eleves) || 0, enseignants_dgeo: num(eff.enseignants_dgeo) || 0, enseignants_js: num(eff.enseignants_js) || 0, moniteurs_js: num(eff.moniteurs_js) || 0, autres: num(eff.autres) || 0 },
    noms_enseignants: (Array.isArray(d.noms_enseignants) ? d.noms_enseignants : []).slice(0, 20).map(str),
    noms_accompagnants: (Array.isArray(d.noms_accompagnants) ? d.noms_accompagnants : []).slice(0, 20).map(str),
    form_expenses: (Array.isArray(d.form_expenses) ? d.form_expenses : []).slice(0, 40).map((e) => ({ categorie: str(e && e.categorie), descriptif: str(e && e.descriptif), pieces: str(e && e.pieces), paye_enseignant: num(e && e.paye_enseignant), paye_commune: num(e && e.paye_commune), cout_total: num(e && e.cout_total) })),
    form_total: num(d.form_total), total: num(d.total),
    // « [calcul] » est un repère interne de Décompte DGEO, pas un mot pour la personne
    warnings: (Array.isArray(d.warnings) ? d.warnings : []).slice(0, 20).map((w) => str(w).replace(/^\[calcul\]\s*/, '')),
    pages: (Array.isArray(d.pages) ? d.pages : []).slice(0, 200).map((p) => ({ number: num(p.number), kind: str(p.kind), url: str(p.url), width: num(p.width), height: num(p.height) })),
    // justificatifs comptés (et non lus) : le volet affichait « Pièces retenues 5 » pour 3
    pieces: pieces.filter((p) => p && p.include !== false).length,
    piecesLues: pieces.length,
    analysedAt: new Date().toISOString(),
    majAt: new Date().toISOString(),
  };
}

// Décompte enregistré ou repris par la page de Décompte DGEO (voir son app.py)
const DOSSIER_RE = /^\/api\/dossiers\/[0-9a-f]{12}(\?|$)/;

/**
 * Démarre la passerelle : renvoie { port, url, close }.
 * opts.target : URL du serveur de Décompte DGEO ; opts.clean(bytes, filename) : Promise de
 * { bytes, removed, total, reason, supposee } ou null (fichier transmis tel quel) ;
 * opts.onCleaned(info) ; opts.onAnalysed(résumé) ; opts.onSaved(résumé) : décompte enregistré ou
 * repris par la page ; opts.log(message).
 */
function startProxy(opts) {
  const target = new URL(opts.target);
  const log = opts.log || (() => {});
  const suivre = (d) => {
    if (!opts.onSaved || !d || typeof d !== 'object') return;
    try { opts.onSaved(summarizeAnalysis(d, d.filename || '')); } catch (e) { log(`décompte DGEO illisible : ${e.message}`); }
  };
  const server = http.createServer((req, res) => {
    const isAnalyse = req.method === 'POST' && /^\/api\/analyse(\?|$)/.test(req.url || '');
    // Le volet « Formulaire du dossier » gardait la part de l'État figée à l'analyse : il suit
    // maintenant chaque enregistrement du décompte, et la reprise d'un décompte commencé.
    const isSave = req.method === 'POST' && DOSSIER_RE.test(req.url || '');
    const isOpen = req.method === 'GET' && DOSSIER_RE.test(req.url || '');
    const forward = (body) => {
      const headers = Object.assign({}, req.headers, { host: target.host });
      if (body) { headers['content-length'] = String(body.length); delete headers['transfer-encoding']; }
      const up = http.request({ host: target.hostname, port: target.port, method: req.method, path: req.url, headers }, (r) => {
        res.writeHead(r.statusCode || 502, r.headers);
        r.pipe(res);
      });
      up.on('error', (e) => {
        // réponse déjà commencée : ajouter le message d'erreur collerait du JSON à la suite du
        // fichier déjà transmis (et fausserait content-length) ; mieux vaut couper.
        if (res.headersSent || res.writableEnded) { log(`Décompte DGEO injoignable en cours de réponse : ${e.message}`); try { res.destroy(); } catch (err) { /* ignore */ } return; }
        res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ detail: `Décompte DGEO injoignable : ${e.message}` }));
      });
      if (body) up.end(body); else req.pipe(up);
    };
    // Réponse lue en entier au passage : traiter(json) peut la compléter (renvoie un objet) ou
    // seulement l'observer (renvoie rien) ; body : requête déjà lue, ou null pour la relayer.
    const forwardRead = (body, traiter) => {
      const headers = Object.assign({}, req.headers, { host: target.host });
      if (body) { headers['content-length'] = String(body.length); delete headers['transfer-encoding']; }
      const up = http.request({ host: target.hostname, port: target.port, method: req.method, path: req.url, headers }, (r) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => {
          let buf = Buffer.concat(chunks);
          if (r.statusCode === 200 && /json/i.test(r.headers['content-type'] || '')) {
            try {
              const complete = traiter(JSON.parse(buf.toString('utf8')));
              if (complete) buf = Buffer.from(JSON.stringify(complete), 'utf8');
            } catch (e) { log(`réponse de Décompte DGEO illisible : ${e.message}`); }
          }
          const h = Object.assign({}, r.headers, { 'content-length': String(buf.length) });
          delete h['transfer-encoding'];
          res.writeHead(r.statusCode || 502, h);
          res.end(buf);
        });
      });
      up.on('error', (e) => {
        // réponse déjà commencée : ajouter le message d'erreur collerait du JSON à la suite du
        // fichier déjà transmis (et fausserait content-length) ; mieux vaut couper.
        if (res.headersSent || res.writableEnded) { log(`Décompte DGEO injoignable en cours de réponse : ${e.message}`); try { res.destroy(); } catch (err) { /* ignore */ } return; }
        res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ detail: `Décompte DGEO injoignable : ${e.message}` }));
      });
      if (body) up.end(body); else req.pipe(up);
    };
    // envoi du dossier : la réponse (dossier analysé) est lue au passage pour afficher le formulaire
    // dans l'application ; la page de Décompte DGEO y apprend quelle page a été retirée — sans
    // cela, seule une note de la barre latérale, masquée à 1440 px, le disait.
    const forwardAnalyse = (body, filename, retrait) => forwardRead(body, (d) => {
      if (retrait) d.pages_retirees = retrait;
      if (opts.onAnalysed) opts.onAnalysed(summarizeAnalysis(d, filename));
      return retrait ? d : null;
    });
    if (isOpen) { forwardRead(null, (etat) => { suivre(etat && etat.dossier); }); return; }
    if (!isAnalyse && !isSave) { forward(null); return; }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('error', () => { try { res.destroy(); } catch (e) { /* ignore */ } });
    req.on('end', async () => {
      const body = Buffer.concat(chunks);
      if (isSave) {
        forwardRead(body, () => { try { const etat = JSON.parse(body.toString('utf8')); suivre(etat && etat.dossier); } catch (e) { /* état illisible : Décompte DGEO l'a déjà dit */ } });
        return;
      }
      try {
        const mp = parseMultipart(body, req.headers['content-type']);
        const filePart = mp.parts.find((p) => p.name === 'file');
        if (!filePart) { forward(body); return; }
        // « Réanalyser avec toutes les pages » (page de Décompte DGEO) : rien n'est retiré
        const garder = mp.parts.some((p) => p.name === 'garder_toutes_les_pages' && p.data.toString() === '1');
        if (garder || !opts.clean) {
          if (garder) {
            log(`dossier « ${filePart.filename} » transmis avec toutes ses pages, à la demande`);
            if (opts.onCleaned) opts.onCleaned({ filename: filePart.filename || '', removed: [], total: 0, reason: 'toutes les pages gardées, à la demande' });
          }
          forwardAnalyse(body, filePart.filename || '', null);
          return;
        }
        const result = await opts.clean(filePart.data, filePart.filename || '');
        let retrait = null;
        if (result && Array.isArray(result.removed) && result.removed.length && result.bytes) {
          filePart.data = Buffer.from(result.bytes);
          retrait = { pages: result.removed.slice(), total: result.total || 0, supposee: !!result.supposee };
          log(`dossier « ${filePart.filename} » : page(s) ${result.removed.join(', ')} sur ${result.total} retirée(s) avant Décompte DGEO (${result.reason})`);
        } else {
          log(`dossier « ${filePart.filename} » transmis tel quel${result && result.reason ? ` (${result.reason})` : ''}`);
        }
        if (opts.onCleaned) opts.onCleaned({ filename: filePart.filename || '', removed: result ? result.removed || [] : [], total: result ? result.total || 0 : 0, reason: result ? result.reason || '' : 'nettoyage indisponible' });
        forwardAnalyse(buildMultipart(mp.boundary, mp.parts), filePart.filename || '', retrait);
      } catch (e) {
        log(`passerelle Décompte DGEO : ${e.message} ; dossier transmis tel quel`);
        forward(body);
      }
    });
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ port, url: `http://127.0.0.1:${port}/`, close: () => new Promise((r) => { server.close(() => r()); if (server.closeAllConnections) server.closeAllConnections(); }) });
    });
  });
}

module.exports = { startProxy, parseMultipart, buildMultipart, summarizeAnalysis };
