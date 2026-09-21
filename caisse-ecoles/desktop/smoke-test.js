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

// Electron charge desktop/app/Caisse-ecoles.html, une copie produite par prepare-app.js. Si on
// oublie de la refaire après une modification de src/, le test passe sur l'ancienne application
// et ne prouve rien : on s'arrête plutôt que de rendre un vert trompeur.
function verifierCopie() {
  const fs = require('fs');
  const copie = path.join(__dirname, 'app', 'Caisse-ecoles.html');
  const source = path.join(__dirname, '..', 'dist', 'Caisse-ecoles.html');
  if (!fs.existsSync(copie)) throw new Error('desktop/app/Caisse-ecoles.html manque : lancez `node desktop/prepare-app.js`.');
  if (!fs.existsSync(source)) return; // construite ailleurs (paquet, CI) : rien à comparer
  if (fs.statSync(source).mtimeMs > fs.statSync(copie).mtimeMs) {
    throw new Error('desktop/app/Caisse-ecoles.html est plus ancienne que dist/Caisse-ecoles.html : lancez `npm run build:public && node desktop/prepare-app.js`.');
  }
}

(async () => {
  const exe = process.argv[2];
  if (!exe) verifierCopie();
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

  // deux formulaires « PIÈCE COMPTABLE » sur une même page : les deux écritures doivent survivre
  // à une relecture (fin de l'OCR, changement de mode…), sans perte ni doublon
  const deuxFormulaires = await win.evaluate(() => {
    const A = window.CaisseApp;
    const form = (no, dy, doit, somme, avoir, libelle, date) => {
      const w = (str, x, y) => ({ str, x, y: y + dy, h: 10 });
      const out = [w('PIECE', 79, 82), w('COMPTABLE', 114, 82), w(no, 349, 79), w('DOIT', 79, 114), w('SOMME', 338, 112), w('AVOIR', 410, 112), w('Libellé', 342, 220), w('Total', 78, 390)];
      doit.split(' ').forEach((t, i) => out.push(w(t, 155 + i * 31, 142)));
      somme.split(' ').forEach((t, i) => out.push(w(t, 332 + i * 24, 142)));
      avoir.split(' ').forEach((t, i) => out.push(w(t, 454 + i * 28, 142)));
      somme.split(' ').forEach((t, i) => out.push(w(t, 332 + i * 24, 388)));
      libelle.forEach((l, li) => l.split(' ').forEach((t, i) => out.push(w(t, 78 + i * 40, 261 + li * 14))));
      date.split(' ').forEach((t, i) => out.push(w(t, 56 + i * 14, 425)));
      return out;
    };
    const words = form('10', 0, '51000.3185.00', 'CHF 12.00', '9100.104', ['REMBOURSEMENT piles', 'R. Desaules'], '01.03.2025')
      .concat(form('11', 420, '9100.104', 'CHF 300.00', '51000.4392.20', ['PARTICIPATION DES PARENTS', 'E. Vallon'], '02.03.2025'));
    A.state.pages = [{ docId: 'smoke-2formulaires', pageInDoc: 1, pageNumber: 1, width: 595, height: 842, words }];
    A.state.entries = [];
    A.reparse();
    const avant = A.state.entries.filter((e) => !e.manual).map((e) => e.no);
    A.reparse(); // relecture : c'est là que les deux écritures retombaient sur le même objet
    const apres = A.state.entries.filter((e) => !e.manual).map((e) => e.no);
    return { avant, apres };
  });
  // ce lot d'essai quitte le journal AVANT d'effacer les écritures (le retrait s'appuie dessus)
  await win.evaluate(async () => {
    await window.CaisseApp.retirerDuJournal();
    const A = window.CaisseApp;
    A.state.pages = []; A.state.entries = []; A.reparse(); A.refreshAll();
  });
  console.log('deux formulaires sur une page :', JSON.stringify(deuxFormulaires));

  // les champs de montant acceptent le séparateur de milliers que l'application affiche elle-même
  // (un champ « number » vidait la valeur et le contrôle était sauté en silence)
  const montants = await win.evaluate(() => {
    const R = window.CaisseRegistre;
    const essai = (id, texte) => { const el = document.getElementById(id); el.value = texte; return el.value; };
    return {
      checkBalance: essai('checkBalance', '4’825.55'),
      openingAmount: essai('openingAmount', "2'062.20"),
      regOpeningAmount: essai('regOpeningAmount', 'CHF 2 062,20'),
      lu: [R.parseAmountInput('4’825.55'), R.parseAmountInput("2'062.20"), R.parseAmountInput('CHF 2 062,20'), R.parseAmountInput('abc')],
    };
  });
  console.log('montants tapés à la main :', JSON.stringify(montants));

  // UNE SEULE LISTE : une écriture lue sur un scan entre au journal tout de suite, ne s'y double
  // pas à la relecture, et ne double pas une pièce déjà saisie à la main.
  const uneListe = await win.evaluate(async () => {
    const A = window.CaisseApp; const R = window.CaisseRegistre; const S = window.CaisseSaisie;
    const form = (no, dy, doit, somme, avoir, libelle, date) => {
      const w = (str, x, y) => ({ str, x, y: y + dy, h: 10 });
      const out = [w('PIECE', 79, 82), w('COMPTABLE', 114, 82), w(no, 349, 79), w('DOIT', 79, 114), w('SOMME', 338, 112), w('AVOIR', 410, 112), w('Libellé', 342, 220), w('Total', 78, 390)];
      doit.split(' ').forEach((t, i) => out.push(w(t, 155 + i * 31, 142)));
      somme.split(' ').forEach((t, i) => out.push(w(t, 332 + i * 24, 142)));
      avoir.split(' ').forEach((t, i) => out.push(w(t, 454 + i * 28, 142)));
      somme.split(' ').forEach((t, i) => out.push(w(t, 332 + i * 24, 388)));
      libelle.forEach((l, li) => l.split(' ').forEach((t, i) => out.push(w(t, 78 + i * 40, 261 + li * 14))));
      date.split(' ').forEach((t, i) => out.push(w(t, 56 + i * 14, 425)));
      return out;
    };
    const an = S.state.reg.annee;
    // une pièce saisie à la main, que le scan retrouvera (même n°, même montant, même sens)
    const main = R.newPiece(S.state.reg);
    Object.assign(main, { no: 801, date: `${an}-03-01`, type: 'REMBOURSEMENT', detail: 'piles', personne: 'R. Desaules', compte: '51000.3185.00', montant: 12, sens: 'credit' });
    main.libelle = R.composeLibelle(main);
    R.upsertPiece(S.state.reg, main);
    await S.saveReg(); S.renderJournal();
    const depart = S.state.reg.pieces.length;
    const enAttenteAvant = R.pendingPieces(S.state.reg).length;

    const words = form('801', 0, '51000.3185.00', 'CHF 12.00', '9100.104', ['REMBOURSEMENT piles', 'R. Desaules'], `01.03.${an}`)
      .concat(form('802', 420, '9100.104', 'CHF 300.00', '51000.4392.20', ['PARTICIPATION DES PARENTS', 'E. Vallon'], `02.03.${an}`));
    A.state.pages = [{ docId: 'lot-une-liste', pageInDoc: 1, pageNumber: 1, width: 595, height: 842, words }];
    A.state.entries = [];
    A.reparse(); A.refreshAll();
    await new Promise((r) => setTimeout(r, 900));
    const apresLecture = { pieces: S.state.reg.pieces.length, aVerifier: R.pendingPieces(S.state.reg).length, lignes: document.querySelectorAll('#journalBody tr[data-id]').length };

    A.reparse(); A.refreshAll(); // relecture (fin de l'OCR) : rien ne doit se dédoubler
    await new Promise((r) => setTimeout(r, 900));
    const apresRelecture = { pieces: S.state.reg.pieces.length, aVerifier: R.pendingPieces(S.state.reg).length };

    const mainApres = S.state.reg.pieces.find((p) => p.id === main.id);
    const retires = await A.retirerDuJournal();
    A.state.pages = []; A.state.entries = []; A.reparse(); A.refreshAll();
    await new Promise((r) => setTimeout(r, 300));
    const sortie = {
      depart, enAttenteAvant, apresLecture, apresRelecture, retires,
      finPieces: S.state.reg.pieces.length,
      mainIntacte: !!mainApres && mainApres.source === 'saisie' && mainApres.aVerifier === false && mainApres.montant === 12,
      mainSurvit: !!S.state.reg.pieces.find((p) => p.id === main.id),
    };
    // l'essai ne laisse rien derrière lui : le registre repart comme il était
    R.removePiece(S.state.reg, main.id);
    await S.saveReg(); S.renderJournal();
    sortie.registreRendu = S.state.reg.pieces.length === depart - 1;
    return sortie;
  });
  console.log('une seule liste :', JSON.stringify(uneListe));
  const uneListeOk = uneListe.apresLecture.pieces === uneListe.depart + 1 // seule la pièce 802 est neuve
    && uneListe.apresLecture.aVerifier === uneListe.enAttenteAvant + 1 && uneListe.apresLecture.lignes === uneListe.apresLecture.pieces
    && uneListe.apresRelecture.pieces === uneListe.apresLecture.pieces && uneListe.apresRelecture.aVerifier === uneListe.apresLecture.aVerifier
    && uneListe.mainIntacte && uneListe.retires === 1 && uneListe.mainSurvit
    && uneListe.finPieces === uneListe.depart && uneListe.registreRendu;
  const montantsOk = montants.checkBalance === '4’825.55' && montants.openingAmount === "2'062.20"
    && montants.regOpeningAmount === 'CHF 2 062,20'
    && JSON.stringify(montants.lu) === JSON.stringify([4825.55, 2062.2, 2062.2, null]);
  const paire = (l) => Array.isArray(l) && l.length === 2 && l[0] === 10 && l[1] === 11;
  let ok = /Compta Blonay/.test(shellTitle) && /Caisse écoles/.test(title) && info.parser === 'object' && info.excel === 'object' && info.ocr && info.registre === 'object' && info.pdf === 'object' && info.files
    && !!entry && entry.credit === 12 && entry.compte === '50000.3652.00'
    && paire(deuxFormulaires.avant) && paire(deuxFormulaires.apres) && montantsOk && uneListeOk;

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
  // décomptes : choix course d'école / camp sur la fiche ; récapitulatif PDF des décomptes cochés,
  // dans l'espace « Récapitulatif » de l'outil Décompte DGEO
  const recapInfo = await win.evaluate(async () => {
    const s = window.CaisseSaisie.state;
    document.getElementById('pType').value = 'DECOMPTE'; document.getElementById('pType').dispatchEvent(new Event('change'));
    const kindShown = !document.getElementById('pKindField').classList.contains('hidden') && document.getElementById('pObjetField').classList.contains('hidden');
    const kinds = Array.from(document.querySelectorAll('#pKind input')).map((r) => r.value);
    window.CaisseApp.showPanel('panelRecap');
    const inDgeoTool = document.getElementById('toolName').textContent === 'Décompte DGEO' && !document.getElementById('dgeoNav').classList.contains('hidden')
      && !document.getElementById('panelRecap').classList.contains('hidden') && document.getElementById('panelSaisie').classList.contains('hidden')
      && !!document.querySelector('#dgeoNav .apptab[data-panel="panelRecap"].active');
    const rows = document.querySelectorAll('#recapBody tr[data-id]').length;
    const pieces = s.reg.pieces.filter((p) => p.type === 'DECOMPTE');
    const res = await window.CaissePdf.buildRecapPdf(pieces, s.reg, { title: 'test' });
    window.CaisseApp.showPanel('panelSaisie');
    return { kindShown, kinds, inDgeoTool, rows, pages: res.pages, total: res.total, n: pieces.length };
  });
  console.log('décomptes :', JSON.stringify(recapInfo));
  ok = ok && recapInfo.kindShown && recapInfo.kinds.join('|') === "Course d'école|Camp" && recapInfo.inDgeoTool && recapInfo.rows >= 1 && recapInfo.pages >= 1 && recapInfo.total >= 143.95;

  // Séparation des espaces : ce qu'on règle une fois par année (année, solde à nouveau, compte
  // caisse, reprise d'un classeur, sauvegardes) a quitté l'écran de saisie pour « L'année & les
  // données » ; la saisie n'en garde qu'un bandeau de rappel, et les réglages de lecture des
  // pièces scannées sont repliés sous la zone de dépôt.
  const sep = await win.evaluate(async () => {
    const dans = (panneau, id) => !!document.getElementById(panneau).querySelector('#' + id);
    const S = window.CaisseSaisie;
    // les réglages ne sont plus sur l'écran de saisie, mais sur le leur
    const deplaces = ['regYear', 'regOpeningDate', 'regOpeningAmount', 'regCaisse', 'btnRegExcelIn', 'btnRegExport', 'btnRegImport']
      .every((id) => dans('panelAnnee', id) && !dans('panelSaisie', id));
    // la saisie garde un bandeau d'une ligne qui rappelle l'essentiel, et y renvoie
    const bar = document.getElementById('yearBar');
    const rappelle = /solde à nouveau/.test(bar.textContent) && /compte caisse/.test(bar.textContent)
      && bar.textContent.includes(String(S.state.reg.annee));
    bar.querySelector('button[data-annee]').click();
    const renvoie = !document.getElementById('panelAnnee').classList.contains('hidden')
      && document.getElementById('panelSaisie').classList.contains('hidden');
    // le solde à nouveau changé ailleurs se relit sur l'écran des réglages (pas de valeur périmée)
    S.state.reg.opening.amount = 1234.5; await S.saveReg(); S.renderJournal();
    const recopie = document.getElementById('regOpeningAmount').value === '1234.5';
    S.state.reg.opening.amount = 0; await S.saveReg(); S.renderJournal();
    // pièces scannées : la zone de dépôt d'abord, les réglages repliés avec leur résumé
    window.CaisseApp.showPanel('panelScan');
    const scan = document.getElementById('panelScan');
    const noeuds = Array.from(scan.children);
    const depotAvantReglages = noeuds.indexOf(document.getElementById('step2')) < noeuds.indexOf(document.getElementById('step1'));
    const step1 = document.getElementById('step1');
    const replie = step1.tagName === 'DETAILS' && !step1.open;
    const resume = document.getElementById('step1Resume').textContent;
    window.CaisseApp.showPanel('panelSaisie');
    return { deplaces, rappelle, renvoie, recopie, depotAvantReglages, replie, resume };
  });
  console.log('espaces séparés :', JSON.stringify(sep));
  ok = ok && sep.deplaces && sep.rappelle && sep.renvoie && sep.recopie && sep.depotAvantReglages
    && sep.replie && /compte caisse/.test(sep.resume) && /OCR/.test(sep.resume);

  // nouvelle année par le petit formulaire en ligne (window.prompt n'existe pas dans Electron)
  const ny = await win.evaluate(async () => {
    const s = window.CaisseSaisie.state; const y0 = s.reg.annee;
    document.getElementById('btnNewYear').click();
    const box = document.getElementById('newYearBox'); const shown = !box.classList.contains('hidden');
    document.getElementById('newYearInput').value = String(y0 + 1);
    document.getElementById('btnNewYearOk').click();
    await new Promise((r) => setTimeout(r, 800));
    const created = s.reg.annee === y0 + 1 && s.years.includes(y0 + 1);
    await window.CaisseSaisie.openYear(y0);
    return { shown, created, hidden: box.classList.contains('hidden'), back: s.reg.annee === y0 };
  });
  console.log('nouvelle année :', JSON.stringify(ny));
  ok = ok && ny.shown && ny.created && ny.hidden && ny.back;

  // pièces scannées et saisie synchronisées : un classeur Excel de l'année (ancienne méthode) est repris
  // dans le registre sans rien compter deux fois, et l'espace des pièces scannées s'appuie sur ce registre
  const sync = await win.evaluate(async () => {
    const s = window.CaisseSaisie.state; const R = window.CaisseRegistre; const X = window.CaisseExcel;
    const before = s.reg.pieces.length;
    const existing = s.reg.pieces[0]; // déjà dans le registre : reconnue, pas comptée deux fois
    const entries = [
      { no: existing.no, date: existing.date, compte: existing.compte, libelle: existing.libelle, debit: existing.sens === 'debit' ? existing.montant : null, credit: existing.sens === 'credit' ? existing.montant : null },
      { no: 150, date: `${s.reg.annee}-03-02`, compte: '51000.4392.20', libelle: 'PARTICIPATION DES PARENTS - Cours de ski 5P/6 du 06-10.01.2026 - Ch. Dupraz', debit: 400, credit: null },
    ];
    const { workbook } = X.buildWorkbook({ opening: { date: `${s.reg.annee}-01-01`, amount: 1000 }, entries });
    const buf = await workbook.xlsx.writeBuffer();
    const r = await window.CaisseSaisie.importWorkbook(buf, 'Caisse écoles test.xlsx');
    const p150 = s.reg.pieces.find((p) => p.no === 150);
    window.CaisseApp.showPanel('panelScan');
    window.CaisseApp.applyMode('registre');
    const info = document.getElementById('registreInfo').textContent;
    const a = window.CaisseApp.state;
    window.CaisseApp.showPanel('panelSaisie');
    return { added: r ? r.added.length : null, skipped: r ? r.skipped.length : null, openingDiffers: r ? r.openingDiffers : null, pieces: s.reg.pieces.length, before, source: p150 ? p150.source : null, type: p150 ? p150.type : null,
      nextNo: R.nextNo(s.reg), excelTag: !!document.querySelector('#journalBody .tag'), mode: a.mode, info: info.slice(0, 90), regTag: /Registre \d{4} \(Saisie des pièces\)/.test(info) };
  });
  console.log('synchronisation scan ↔ saisie :', JSON.stringify(sync));
  ok = ok && sync.added === 1 && sync.skipped === 1 && sync.pieces === sync.before + 1 && sync.source === 'excel' && sync.type === 'PARTICIPATION DES PARENTS' && sync.nextNo === 151 && sync.excelTag && sync.mode === 'registre' && sync.regTag;

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
  // après l'enregistrement, le comptage reste affiché : la tuile « Solde compté » (2e) montre son total
  ok = ok && totalTxt === '341.55' && count.total === 341.55 && count.billets === 340 && count.pieces === 1.55 && count.rows >= 1 && count.kpis.length === 5 && count.kpis[1] === '341.55'
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
        const s = window.CaisseSaisie.state; const R = window.CaisseRegistre;
        const p = R.newPiece(s.reg); // pièce fictive (le registre du poste peut être vide)
        Object.assign(p, { no: 99, type: 'DECOMPTE', objet: "Course d'école", classe: '5P/3', periode: '12.06.2026', detail: 'Lausanne', personne: 'A. Berger', montant: 143.95, sens: 'credit', compte: '51000.3662.00', date: `${s.reg.annee}-06-20` });
        p.libelle = R.composeLibelle(p);
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
      // le formulaire du dossier (ici sa première page) s'affiche à côté de Décompte DGEO, avec les champs lus
      let formPane = null;
      try {
        await win.waitForFunction(() => { const p = document.getElementById('dgeoFormPane'); return p && !p.classList.contains('hidden') && p.querySelector('#dgeoFormPages img'); }, null, { timeout: 15000 });
        formPane = await win.evaluate(async () => {
          const img = document.querySelector('#dgeoFormPages img');
          const loaded = await new Promise((r) => { if (img.complete) r(img.naturalWidth > 0); else { img.onload = () => r(img.naturalWidth > 0); img.onerror = () => r(false); setTimeout(() => r(img.naturalWidth > 0), 8000); } });
          return { src: img.src.replace(/^http:\/\/127\.0\.0\.1:\d+/, ''), loaded, file: document.getElementById('dgeoFormFile').textContent, fields: document.getElementById('dgeoFormFields').textContent.slice(0, 80), stored: window.CaisseDgeo.dossiers ? (await window.CaisseDgeo.dossiers()).length : null };
        });
      } catch (e) { console.log('formulaire du dossier : non affiché', e.message); }
      console.log('formulaire du dossier :', JSON.stringify(formPane));
      ok = ok && !!formPane && /^\/api\/pages\//.test(formPane.src) && formPane.loaded && /dossier-test\.pdf/.test(formPane.file) && (formPane.stored === null || formPane.stored >= 1);
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

        // le même décompte refait après la création de la pièce : un seul enregistrement, toujours
        // lié à sa pièce, et rien ne revient dans « à passer en pièce comptable »
        const capturedBefore = await win.evaluate(async () => ((await window.CaisseDgeo.list()).find((x) => x.id === 'smoke-dgeo') || {}).capturedAt || '');
        await dgeoPage.evaluate(async (d) => { const r = await fetch('/api/excel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); await r.blob(); }, dossier);
        const again = await win.evaluate(async (was) => {
          let list = [];
          for (let i = 0; i < 50; i++) {
            list = await window.CaisseDgeo.list();
            const mine = list.filter((x) => x.id === 'smoke-dgeo');
            if (mine.length > 1 || (mine[0] && mine[0].capturedAt !== was)) break;
            await new Promise((r) => setTimeout(r, 200));
          }
          const mine = list.filter((x) => x.id === 'smoke-dgeo');
          await window.CaisseSaisie.refreshDgeo();
          return { entries: mine.length, refait: !!(mine[0] && mine[0].capturedAt !== was), saisi: !!(mine[0] && mine[0].saisi), linked: !!(mine[0] && mine[0].pieceId), pending: document.querySelectorAll('#dgeoPending button[data-dgeo-use="smoke-dgeo"]').length };
        }, capturedBefore);
        console.log('décompte refait :', JSON.stringify(again));
        ok = ok && again.entries === 1 && again.refait && again.saisi && again.linked && again.pending === 0;
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
