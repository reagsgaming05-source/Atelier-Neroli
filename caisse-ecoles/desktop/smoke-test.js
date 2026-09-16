/*
 * Test de fumée de l'application fenêtrée : la fenêtre à onglets s'ouvre, Caisse écoles est
 * chargée, le moteur de lecture et l'OCR embarqué fonctionnent, le lecteur natif répond si
 * présent, une pièce saisie dans la fiche arrive dans le journal et dans les fichiers de
 * l'application, la fiche PDF se génère, l'onglet Décompte DGEO (démarré avec l'application)
 * s'affiche s'il est inclus, et un décompte terminé dans cet onglet est proposé puis enregistré
 * comme pièce DECOMPTE dans la caisse (pont entre les deux outils).
 *
 *   node smoke-test.js                              # source (electron .)
 *   node smoke-test.js chemin/vers/ComptaBlonay.exe # exécutable empaqueté
 *   SMOKE_NATIVE=1 : exige le lecteur natif ; SMOKE_DGEO=1 : exige Décompte DGEO
 */
const path = require('path');
const { _electron: electron } = require('playwright-core');

async function findPage(app, pred, timeoutMs) {
  const t0 = Date.now();
  for (;;) {
    for (const p of app.windows()) { try { if (pred(p.url())) return p; } catch (e) { /* fermée */ } }
    if (Date.now() - t0 > (timeoutMs || 30000)) throw new Error('page introuvable');
    await new Promise((r) => setTimeout(r, 200));
  }
}

(async () => {
  const exe = process.argv[2];
  const app = await electron.launch(exe ? { executablePath: exe, args: [] } : { args: [path.join(__dirname)] });
  const shell = await findPage(app, (u) => /shell\.html/.test(u));
  const win = await findPage(app, (u) => /Caisse-ecoles\.html/.test(u));
  win.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await win.waitForLoadState('domcontentloaded');
  await win.waitForSelector('#regYear', { state: 'attached' });
  const title = await win.title();
  const shellTitle = await shell.title();
  const info = await win.evaluate(() => ({
    parser: typeof window.CaisseParser, excel: typeof window.CaisseExcel, ocr: !!(window.CaisseOCR && window.CaisseOCR.available()),
    registre: typeof window.CaisseRegistre, pdf: typeof window.CaissePdf, files: !!window.CaisseFiles,
    desktop: window.CaisseDesktop || null, names: !!(window.CaisseVocabNoms && window.CaisseVocabNoms.persons && window.CaisseVocabNoms.persons.length),
    vocab: (document.getElementById('vocabInfo').textContent || '').slice(0, 80),
  }));
  console.log('titre :', shellTitle, '/', title);
  console.log(JSON.stringify(info));
  // lecture d'une pièce synthétique par le moteur (sans PDF : mots positionnés)
  const entry = await win.evaluate(() => {
    const P = window.CaisseParser;
    const w = (str, x, y) => ({ str, x, y, h: 10 });
    const words = [w('PIECE', 79, 82), w('COMPTABLE', 114, 82), w('12', 349, 79), w('DOIT', 79, 114), w('SOMME', 338, 112), w('AVOIR', 410, 112), w('Libellé', 342, 220), w('Total', 78, 390),
      w('50000.3652.00', 155, 142), w('CHF', 332, 142), w('12.00', 356, 142), w('9100.104', 454, 142), w('CHF', 332, 388), w('12.00', 356, 388),
      w('REMBOURSEMENT', 78, 261), w('frais', 118, 261), w('A.', 78, 275), w('Berger', 118, 275), w('01.03.2025', 56, 425)];
    const res = P.parseDocument([{ pageNumber: 1, width: 595, height: 842, words }], { caisse: '9100.104' });
    const e = res.entries[0];
    return e ? { no: e.no, date: e.date, compte: e.compte, credit: e.credit, libelle: e.libelle } : null;
  });
  console.log('pièce synthétique :', JSON.stringify(entry));
  let ok = /Compta Blonay/.test(shellTitle) && /Caisse écoles/.test(title) && info.parser === 'object' && info.excel === 'object' && info.ocr && info.registre === 'object' && info.pdf === 'object' && info.files
    && !!entry && entry.credit === 12 && entry.compte === '50000.3652.00';

  // saisie d'une pièce dans la fiche -> journal -> fichiers de l'application
  await win.waitForFunction(() => window.CaisseSaisie && window.CaisseSaisie.state.reg, null, { timeout: 20000 });
  await win.evaluate(() => window.CaisseApp.showPanel('panelSaisie')); // l'application rouvre le dernier espace utilisé
  const year = await win.evaluate(() => window.CaisseSaisie.state.reg.annee);
  await win.selectOption('#pType', 'DECOMPTE');
  await win.check('#pKind input[value="Course d\'école"]'); // pour un DECOMPTE, la liste des objets laisse place au choix course d'école / camp
  await win.fill('#pClasse', '5P/3');
  await win.fill('#pPeriode', '12.06.' + year);
  await win.fill('#pDetail', 'Lausanne');
  await win.fill('#pPersonne', 'A. Berger');
  await win.fill('#pMontant', '143.95');
  await win.fill('#pDate', `${year}-06-15`);
  await win.check('#pSensCredit');
  const before = await win.evaluate(() => window.CaisseSaisie.state.reg.pieces.length);
  await win.click('#btnPieceSave');
  await win.waitForFunction((n) => window.CaisseSaisie.state.reg.pieces.length === n + 1, before, { timeout: 10000 });
  // la fiche PDF s'ouvre automatiquement dans une fenêtre de l'application (visionneuse, imprimable)
  let pdfWin = null;
  try { pdfWin = await findPage(app, (u) => /^blob:/.test(u), 15000); } catch (e) { /* absente */ }
  console.log('fiche PDF ouverte :', pdfWin ? pdfWin.url().slice(0, 40) + '…' : 'non');
  ok = ok && !!pdfWin;
  if (pdfWin) { await pdfWin.waitForTimeout(500); await pdfWin.close().catch(() => {}); }
  const saisie = await win.evaluate(async () => {
    const R = window.CaisseRegistre; const s = window.CaisseSaisie.state;
    const p = s.reg.pieces[s.reg.pieces.length - 1];
    const j = R.journal(s.reg);
    const stored = window.CaisseFiles ? await window.CaisseFiles.load(s.reg.annee) : null;
    const pdf = await window.CaissePdf.buildPdf([p], s.reg, () => null);
    return { no: p.no, libelle: p.libelle, compte: p.compte, sens: p.sens, montant: p.montant, rows: j.rows.length, end: j.end, storedPieces: stored ? JSON.parse(stored).pieces.length : null, pdfPages: pdf.pages, journalRows: document.querySelectorAll('#journalBody tr[data-id]').length };
  });
  console.log('pièce saisie :', JSON.stringify(saisie));
  ok = ok && saisie.compte === '51000.3662.00' && saisie.sens === 'credit' && saisie.montant === 143.95 && saisie.journalRows === saisie.rows && saisie.pdfPages === 1 && /DECOMPTE - Course d'école 5P\/3 du 12\.06\./.test(saisie.libelle) && (saisie.storedPieces === null || saisie.storedPieces === saisie.rows);
  // décomptes : choix course d'école / camp sur la fiche, récapitulatif PDF des décomptes cochés
  const recapInfo = await win.evaluate(async () => {
    const s = window.CaisseSaisie.state;
    document.getElementById('pType').value = 'DECOMPTE'; document.getElementById('pType').dispatchEvent(new Event('change'));
    const kindShown = !document.getElementById('pKindField').classList.contains('hidden') && document.getElementById('pObjetField').classList.contains('hidden');
    const kinds = Array.from(document.querySelectorAll('#pKind input')).map((r) => r.value);
    const rows = document.querySelectorAll('#recapBody tr[data-id]').length;
    const pieces = s.reg.pieces.filter((p) => p.type === 'DECOMPTE');
    const res = await window.CaissePdf.buildRecapPdf(pieces, s.reg, { title: 'test' });
    return { kindShown, kinds, rows, pages: res.pages, total: res.total, n: pieces.length };
  });
  console.log('décomptes :', JSON.stringify(recapInfo));
  ok = ok && recapInfo.kindShown && recapInfo.kinds.join('|') === "Course d'école|Camp" && recapInfo.rows >= 1 && recapInfo.pages >= 1 && recapInfo.total >= 143.95;

  // comptage de la caisse : billets et pièces -> total, dernier solde / nouveau solde, écart avec le journal
  await win.evaluate(() => window.CaisseApp.showPanel('panelCaisse'));
  await win.waitForSelector('#cRows input[data-denom="100"]');
  for (const [d, n] of [['100', '3'], ['20', '2'], ['0.5', '3'], ['0.05', '1']]) await win.fill(`#cRows input[data-denom="${d}"]`, n);
  await win.dispatchEvent('#cRows input[data-denom="0.05"]', 'input');
  const totalTxt = await win.evaluate(() => document.getElementById('cTotal').textContent);
  const n0c = await win.evaluate(() => window.CaisseSaisie.state.reg.comptages.length);
  await win.click('#btnCountSave');
  await win.waitForFunction((n) => window.CaisseSaisie.state.reg.comptages.length === n + 1, n0c, { timeout: 10000 });
  const count = await win.evaluate(async () => {
    const s = window.CaisseSaisie.state; const c = s.reg.comptages[s.reg.comptages.length - 1];
    const stored = window.CaisseFiles ? JSON.parse(await window.CaisseFiles.load(s.reg.annee)) : null;
    const kpis = Array.from(document.querySelectorAll('#cKpis .t .v')).map((e) => e.textContent);
    return { total: c.total, billets: c.billets, pieces: c.pieces, kpis, rows: document.querySelectorAll('#countBody tr[data-id]').length, storedCounts: stored ? stored.comptages.length : null, book: window.CaisseRegistre.balanceAt(s.reg, c.date) };
  });
  console.log('comptage :', totalTxt, JSON.stringify(count));
  // le journal ne contient que la pièce de test (sortie de 143.95 depuis un solde à nouveau de 0 ou celui du poste) : l'écart affiché doit être total − solde du journal
  ok = ok && totalTxt === '341.55' && count.total === 341.55 && count.billets === 340 && count.pieces === 1.55 && count.rows >= 1 && count.kpis.length === 5 && count.kpis[0] === '341.55'
    && (count.storedCounts === null || count.storedCounts === count.rows);
  await win.evaluate(async () => { const s = window.CaisseSaisie.state; window.CaisseRegistre.removeCount(s.reg, s.reg.comptages[s.reg.comptages.length - 1].id); await s.storage.save(s.reg); window.CaisseComptage.render(); window.CaisseApp.showPanel('panelSaisie'); });
  // nettoyage : la pièce de test est retirée du registre
  await win.evaluate(async () => { const s = window.CaisseSaisie.state; window.CaisseRegistre.removePiece(s.reg, s.reg.pieces[s.reg.pieces.length - 1].id); await s.storage.save(s.reg); window.CaisseSaisie.renderJournal(); });

  if (process.env.SMOKE_OCR !== '0') {
    const ocr = await win.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 400; c.height = 100;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 100);
      ctx.fillStyle = '#000'; ctx.font = '40px Arial'; ctx.fillText('CHF 29.70', 20, 65);
      const engine = await window.CaisseOCR.createEngine();
      const blocks = await engine.recognize(c, 7);
      const words = window.CaisseOCR.itemsFromBlocks(blocks, 1, 0, 0).map((x) => x.str);
      await engine.terminate();
      return words.join(' ');
    });
    console.log('OCR embarqué :', JSON.stringify(ocr));
    ok = ok && /29\.70/.test(ocr);
  }
  // troisième lecteur (Tesseract natif) : présent dans la version portable, facultatif en développement
  const nat = await win.evaluate(async () => {
    if (!window.CaisseNative) return { available: false, reason: 'pas de pont' };
    const info = await window.CaisseNative.ocrInfo();
    if (!info.available) return info;
    const c = document.createElement('canvas'); c.width = 400; c.height = 100;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 100);
    ctx.fillStyle = '#000'; ctx.font = '40px Arial'; ctx.fillText('CHF 29.70', 20, 65);
    const png = await new Promise((r) => c.toBlob((b) => b.arrayBuffer().then((buf) => r(new Uint8Array(buf))), 'image/png'));
    const words = await window.CaisseNative.ocrRecognize(png, { psm: 7, oem: 1, dpi: 216 });
    let legacy = null;
    if (info.legacy) legacy = (await window.CaisseNative.ocrRecognize(png, { psm: 7, oem: 0, lang: 'fra_leg', dpi: 216 })).map((w) => w.text).join(' ');
    return Object.assign({}, info, { read: words.map((w) => w.text).join(' '), legacyRead: legacy });
  });
  console.log('Tesseract natif :', JSON.stringify(nat));
  if (process.env.SMOKE_NATIVE === '1') ok = ok && nat.available && /29\.70/.test(nat.read || '') && (!nat.legacy || /29\.70/.test(nat.legacyRead || ''));

  // onglet Décompte DGEO (démarré avec l'application, sans cliquer)
  const st = await shell.evaluate(() => window.CaisseShell.state());
  console.log('coquille :', JSON.stringify(st));
  if (st.hasDgeo) {
    let dgeoPage = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 120000) {
      dgeoPage = app.windows().find((p) => /^http:\/\/127\.0\.0\.1:\d+\//.test(p.url()));
      if (dgeoPage) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    await win.evaluate(() => window.CaisseApp.showPanel('panelDgeo')); // espace « Décompte DGEO » de la barre latérale
    if (dgeoPage) {
      await dgeoPage.waitForLoadState('domcontentloaded');
      const dt = await dgeoPage.title();
      const st2 = await shell.evaluate(() => window.CaisseShell.state());
      console.log('Décompte DGEO :', dgeoPage.url(), '–', dt, '–', JSON.stringify(st2));
      ok = ok && /Décompte/i.test(dt + (await dgeoPage.content()).slice(0, 2000)) && st2.dgeo === 'ready' && st2.active === 'dgeo' && st2.embedded === true;

      // pont : un décompte terminé dans DGEO (fichier Excel généré) est proposé en pièce dans la caisse
      const dossier = { id: 'smoke-dgeo', filename: 'decompte-test.pdf', numero: 'D-TEST-1', type_activite: 'course', type_activite_texte: "Course d'école", activite: 'Lausanne', classe: '5P/3', enseignant: 'A. Berger', telephone: '',
        date_debut: `12.06.${year}`, date_fin: `12.06.${year}`, date_decompte: `20.06.${year}`, budget: null, effectifs: { eleves: 20, enseignants_dgeo: 2, enseignants_js: 0, moniteurs_js: 0, autres: 1 }, noms_enseignants: [], noms_accompagnants: [],
        form_expenses: [{ categorie: 'Transport', descriptif: 'CFF', pieces: '1', paye_enseignant: 143.95, paye_commune: null, cout_total: 143.95 }], form_total: 143.95, taux_eur_chf: null, pages: [], pieces: [],
        rows: [{ rubrique: 'Transport', libelle: 'CFF 2 titrés', mode: 'direct', cout_total: null, cout_direct: 24.4, pieces: [] }], total: 24.4, warnings: [], ocr_engine: '' };
      const status = await dgeoPage.evaluate(async (d) => { const r = await fetch('/api/excel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); await r.blob(); return r.status; }, dossier);
      console.log('Excel généré par DGEO :', status);
      // dossier scanné qui commence par la pièce comptable : la passerelle la retire avant l'analyse
      const dossierB64 = await win.evaluate(async () => {
        const s = window.CaisseSaisie.state; const p = s.reg.pieces[s.reg.pieces.length - 1];
        const fiche = await window.CaissePdf.buildPdf([p], s.reg, () => null);
        const doc = await window.PDFLib.PDFDocument.load(fiche.bytes);
        const blank = doc.addPage([595.28, 841.89]); blank.drawText('Ticket CFF Lausanne 2 x CHF 12.20', { x: 60, y: 700, size: 12 });
        const bytes = await doc.save();
        return btoa(String.fromCharCode.apply(null, Array.from(bytes)));
      });
      const analysed = await dgeoPage.evaluate(async (b64) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const fd = new FormData(); fd.append('file', new File([bytes], 'dossier-test.pdf', { type: 'application/pdf' })); fd.append('type_activite', 'course');
        const r = await fetch('/api/analyse', { method: 'POST', body: fd });
        const j = await r.json().catch(() => ({}));
        return { status: r.status, pages: Array.isArray(j.pages) ? j.pages.length : null, detail: j.detail || null };
      }, dossierB64);
      const cleanTxt = await win.evaluate(() => document.getElementById('dgeoCleanInfo').textContent);
      console.log('dossier nettoyé :', JSON.stringify(analysed), '–', cleanTxt);
      ok = ok && analysed.status === 200 && analysed.pages === 1 && /page 1 sur 2 ignorée/.test(cleanTxt);
      await win.evaluate(() => window.CaisseApp.showPanel('panelSaisie'));
      let bridge = null;
      try {
        await win.waitForFunction(() => document.querySelectorAll('#dgeoPending button[data-dgeo-use="smoke-dgeo"]').length > 0, null, { timeout: 15000 });
        bridge = await win.evaluate(async () => {
          const list = await window.CaisseDgeo.list();
          const d = list.find((x) => x.id === 'smoke-dgeo');
          if (d) window.CaisseSaisie.useDecompte(d);
          const v = (id) => document.getElementById(id).value;
          return { found: !!d, type: v('pType'), objet: v('pObjet'), classe: v('pClasse'), periode: v('pPeriode'), personne: v('pPersonne'), montant: v('pMontant'), compte: v('pCompte'), libelle: v('pLibelle'), sens: document.getElementById('pSensCredit').checked ? 'credit' : (document.getElementById('pSensDebit').checked ? 'debit' : null), badge: (await window.CaisseDgeo.state()).decomptes };
        });
      } catch (e) { console.log('pont DGEO → caisse : décompte non proposé', e.message); }
      console.log('pont DGEO → caisse :', JSON.stringify(bridge));
      ok = ok && status === 200 && !!bridge && bridge.found && bridge.type === 'DECOMPTE' && bridge.objet === "Course d'école" && bridge.classe === '5P/3' && bridge.periode === `12.06.${year}` && bridge.montant === '143.95' && bridge.compte === '51000.3662.00' && bridge.sens === 'credit' && bridge.badge >= 1
        && new RegExp(`^DECOMPTE - Course d'école 5P/3 du 12\\.06\\.${year} Lausanne - A\\. Berger$`).test(bridge.libelle);
      if (bridge && bridge.found) {
        // enregistrement : pièce marquée « DGEO », décompte marqué saisi ; puis nettoyage
        const n0 = await win.evaluate(() => window.CaisseSaisie.state.reg.pieces.length);
        await win.click('#btnPieceSave');
        await win.waitForFunction((n) => window.CaisseSaisie.state.reg.pieces.length === n + 1, n0, { timeout: 10000 });
        const saved = await win.evaluate(async () => {
          const s = window.CaisseSaisie.state; const p = s.reg.pieces[s.reg.pieces.length - 1];
          const d = (await window.CaisseDgeo.list()).find((x) => x.id === 'smoke-dgeo');
          return { no: p.no, source: p.source, ref: p.ref, saisi: !!(d && d.saisi), linked: !!(d && d.pieceId === p.id), pending: document.querySelectorAll('#dgeoPending button[data-dgeo-use="smoke-dgeo"]').length, tag: !!document.querySelector(`#journalBody tr[data-id="${p.id}"] span[title^="Créée depuis Décompte DGEO"]`) };
        });
        console.log('pièce depuis DGEO :', JSON.stringify(saved));
        ok = ok && saved.source === 'dgeo' && saved.ref === 'D-TEST-1' && saved.saisi && saved.linked && saved.pending === 0 && saved.tag;
        await win.evaluate(async () => { const s = window.CaisseSaisie.state; window.CaisseRegistre.removePiece(s.reg, s.reg.pieces[s.reg.pieces.length - 1].id); await s.storage.save(s.reg); window.CaisseSaisie.renderJournal(); });
      }
      await win.evaluate(async () => { await window.CaisseDgeo.forget('smoke-dgeo'); await window.CaisseSaisie.refreshDgeo(); });
    } else {
      console.log('Décompte DGEO : le serveur local n\'a pas répondu');
      if (process.env.SMOKE_DGEO === '1') ok = false;
    }
  } else {
    console.log('Décompte DGEO : non inclus');
    if (process.env.SMOKE_DGEO === '1') ok = false;
  }
  await app.close();
  console.log(ok ? 'SMOKE OK' : 'SMOKE ÉCHEC');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
