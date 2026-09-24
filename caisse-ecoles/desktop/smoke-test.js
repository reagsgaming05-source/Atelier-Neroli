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
const fs = require('fs');
const os = require('os');
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

  // Le registre vit dans les données de l'application et survit d'un essai à l'autre. Sur un poste
  // qui a déjà servi, les pièces des passages précédents s'ajoutent aux nôtres et faussent tout ce
  // qui se compte : une recherche par numéro qui devait rendre une ligne en rendait treize. On
  // note donc ce qu'il y avait AVANT, et on le remet à l'identique à la fin. (Vu pour de vrai :
  // deux essais de suite sur le même poste, le second en échec sans rien avoir cassé.)
  const avantTout = await win.evaluate(() => {
    const s = window.CaisseSaisie.state;
    return { annee: s.reg.annee, ids: (s.reg.pieces || []).map((p) => p.id) };
  });

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
    const R = window.CaisseRegistre; const S = window.CaisseSaisie;
    const essai = (id, texte) => { const el = document.getElementById(id); el.value = texte; return el.value; };
    const lus = {
      checkBalance: essai('checkBalance', '4’825.55'),
      openingAmount: essai('openingAmount', "2'062.20"),
      regOpeningAmount: essai('regOpeningAmount', 'CHF 2 062,20'),
      lu: [R.parseAmountInput('4’825.55'), R.parseAmountInput("2'062.20"), R.parseAmountInput('CHF 2 062,20'), R.parseAmountInput('abc')],
    };
    // Et ce que le champ REDONNE à voir. Le solde à nouveau y était réécrit tel quel : 2062.2,
    // deux chiffres après la virgule perdus en route, sur le montant d'ouverture de l'année.
    // On remet ensuite la valeur d'avant : les étapes suivantes comptent sur ce registre.
    const avant = S.state.reg.opening.amount;
    try {
      S.state.reg.opening.amount = 2062.2;
      S.renderJournal();
      lus.rendu = document.getElementById('regOpeningAmount').value;
      lus.renduRelu = R.parseAmountInput(lus.rendu);
    } finally {
      S.state.reg.opening.amount = avant;
      S.renderJournal();
    }
    lus.remisEnPlace = S.state.reg.opening.amount === avant;
    return lus;
  });
  console.log('montants tapés à la main :', JSON.stringify(montants));
  if (montants.rendu !== "2'062.20") throw new Error(`le solde à nouveau se réaffiche « ${montants.rendu} » au lieu de « 2'062.20 »`);
  if (montants.renduRelu !== 2062.2) throw new Error(`le montant réaffiché ne se relit pas : ${montants.renduRelu}`);
  if (!montants.remisEnPlace) throw new Error('le solde à nouveau d\'essai n\'a pas été remis en place');

  // L'interface est en français même si Windows ne l'est pas. Ce que la page ne dessine pas
  // elle-même, Chromium l'habille dans SA langue : le champ « date » surtout, dont le gabarit
  // passe de « mm/dd/yyyy » à « dd/mm/yyyy ». Une date de pièce lue à l'envers, c'est un relevé
  // de caisse faux — et personne ne s'en aperçoit avant le bouclement.
  //
  // C'est « navigator.language » qui commande, pas « Intl » : vérifié en photographiant le champ
  // avec et sans le commutateur. Intl garde sa langue système et n'entre pas en jeu, l'application
  // ne s'en sert jamais sans nommer la langue (« toLocaleDateString('fr-CH') »).
  const langue = await win.evaluate(() => ({
    navigateur: navigator.language,
    langues: navigator.languages,
    intl: new Intl.DateTimeFormat().resolvedOptions().locale, // pour information : pas utilisé ici
  }));
  console.log('langue de l\'interface :', JSON.stringify(langue));
  if (!/^fr/.test(langue.navigateur)) throw new Error(`interface en « ${langue.navigateur} » : les champs date s'afficheraient en mm/dd/yyyy`);

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
  // le type se choisit dans la liste déroulante, comme le fait l'utilisateur : le <select>
  // d'origine reste caché derrière et porte toujours la valeur
  await win.evaluate(() => {
    const champ = document.getElementById('pType').previousElementSibling.querySelector('input');
    champ.value = 'DECOMPTE';
    champ.dispatchEvent(new Event('input', { bubbles: true }));
    champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  await win.waitForFunction(() => document.getElementById('pType').value === 'DECOMPTE', null, { timeout: 5000 });
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

  // La marque de la pièce, de bout en bout : la fiche est imprimée avec son petit code QR, on la
  // rend en image comme le ferait un scanner, et on relit le code. C'est le seul endroit qui
  // éprouve la chaîne entière — dessin PDF, rendu, décodage — parce qu'il faut un canevas.
  const marque = await win.evaluate(async () => {
    const s = window.CaisseSaisie.state;
    const p = s.reg.pieces[s.reg.pieces.length - 1];
    const { bytes } = await window.CaissePdf.buildPdf([p], s.reg, () => null);
    const doc = await window.pdfjsLib.getDocument({ data: bytes.slice(), isEvalSupported: false, verbosity: 0 }).promise;
    const page = await doc.getPage(1);
    // 150 points par pouce, la résolution ordinaire d'un copieur : viewport à 150/72
    const vp = page.getViewport({ scale: 150 / 72 });
    const c = document.createElement('canvas');
    c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const t0 = performance.now();
    const trouve = window.CaisseMarque.chercher(img.data, img.width, img.height);
    const ms = Math.round(performance.now() - t0);
    await doc.destroy();
    return {
      page: [c.width, c.height],
      lu: trouve ? trouve.marque : null,
      attendu: { annee: s.reg.annee, id: p.id },
      ms,
    };
  });
  console.log('marque de la pièce :', JSON.stringify(marque));
  ok = ok && marque.lu && marque.lu.id === marque.attendu.id && marque.lu.annee === marque.attendu.annee;
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
    // Le solde à nouveau changé ailleurs se relit sur l'écran des réglages (pas de valeur
    // périmée), et il s'y relit COMME UN MONTANT : le champ recevait le nombre tel quel, et
    // 1234.5 s'affichait ainsi — des centimes en moins sur le montant d'ouverture de l'année.
    S.state.reg.opening.amount = 1234.5; await S.saveReg(); S.renderJournal();
    const recopie = document.getElementById('regOpeningAmount').value === "1'234.50";
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

  // Retrouver et contrôler : recherche dans le journal, trous dans la suite des numéros,
  // écart de caisse qui désigne la pièce, Ctrl+Entrée sur la fiche.
  const rc = await win.evaluate(async () => {
    const R = window.CaisseRegistre; const S = window.CaisseSaisie; const reg = S.state.reg;
    window.CaisseApp.showPanel('panelSaisie');
    const mk = (no, jour, type, detail, personne, compte, montant, sens) => {
      const p = R.newPiece(reg);
      Object.assign(p, { no, date: `${reg.annee}-05-${String(jour).padStart(2, '0')}`, type, detail, personne, compte, montant, sens });
      p.libelle = R.composeLibelle(p); R.upsertPiece(reg, p);
    };
    // le bloc se suffit à lui-même : la suite des numéros part de la dernière pièce en place,
    // sinon le trou testé serait un saut de deux cents numéros, pas la pièce oubliée du quotidien
    const base = reg.pieces.reduce((m, p) => (Number.isInteger(p.no) && p.no > m ? p.no : m), 0);
    const avant = reg.pieces.length;
    // une caisse d'école a un solde positif : sans solde à nouveau, le journal serait négatif et
    // aucun comptage ne pourrait l'atteindre. Remis comme avant à la fin du bloc.
    const ouvertureAvant = reg.opening.amount;
    const nextAvant = R.nextNo(reg);
    const els0 = document.getElementById('journalSearch');
    reg.opening.amount = 3000;
    mk(base + 1, 4, 'REMBOURSEMENT', 'collation du chœur', 'A. Berger', '51000.3662.50', 29.7, 'credit');
    mk(base + 3, 9, 'AVANCE', 'camp de Leysin', 'L. Duvernay', '52000.3662.00', 1200, 'credit'); // base+2 sauté
    await S.saveReg(); S.renderJournal();
    const lignes = () => Array.from(document.querySelectorAll('#journalBody tr[data-id]')).length;
    const toutes = lignes();
    const champ = document.getElementById('journalSearch');
    const tape = (t) => { champ.value = t; S.renderJournal(); };
    tape('duvernay');
    const parNom = lignes();
    // Chercher par numéro. Compter les lignes ne dit rien de juste : « 5 » trouve aussi « 5P/3 »
    // dans un libellé, et le numéro dépend de ce que le registre portait déjà. Ce qui doit tenir,
    // c'est que la pièce cherchée soit là et que chaque ligne rendue porte bien ce nombre.
    tape(String(base + 3));
    // textContent colle les cellules l'une à l'autre : « 8 » suivi de « 09.05.2026 » donnerait
    // « 809.05… », où le numéro cherché n'est plus un nombre à lui seul. On les sépare.
    const rangees = Array.from(document.querySelectorAll('#journalBody tr[data-id]'))
      .map((tr) => Array.from(tr.cells).map((td) => td.textContent.trim()).join(' | '));
    const parNo = rangees.length;
    const parNoCible = rangees.some((t) => t.split(' | ')[0] === String(base + 3));
    const parNoPropre = rangees.every((t) => new RegExp(`(^|\\D)${base + 3}(\\D|$)`).test(t));
    tape('zzz-introuvable');
    const rien = lignes();
    const messageVide = /Aucune pièce ne correspond/.test(document.getElementById('journalBody').textContent);
    document.querySelector('#journalBody button[data-search-clear]').click();
    const apresVidage = lignes();
    // filtre « seulement à vérifier »
    const casePendantes = document.getElementById('journalOnlyDoubt');
    casePendantes.checked = true; casePendantes.dispatchEvent(new Event('change'));
    const pendantes = lignes();
    casePendantes.checked = false; casePendantes.dispatchEvent(new Event('change'));
    // trou dans la suite : le 202 manque, et le message doit le situer entre ses voisins
    const nums = document.getElementById('journalNumbers').textContent;
    const trouVu = /manquant/.test(nums)
      && nums.includes(`n° ${base + 2}`) && nums.includes(`n° ${base + 1}`) && nums.includes(`n° ${base + 3}`);
    // écart de caisse : le journal moins la pièce 203 (1200) → l'écart doit la désigner
    // Écart de caisse : on met dans la caisse exactement le solde du journal PLUS le montant de
    // la pièce base+3, pour que l'écart vaille son montant au centime près. Le panneau doit la
    // nommer, pas seulement dire qu'il manque de l'argent.
    const auJour = `${reg.annee}-05-31`;
    window.CaisseApp.showPanel('panelCaisse');
    document.getElementById('cDate').value = auJour;
    document.getElementById('cDate').dispatchEvent(new Event('change', { bubbles: true }));
    const cible = Math.round((R.balanceAt(reg, auJour) + 1200) * 100) / 100;
    let reste = Math.round(cible * 100);
    for (const inp of document.querySelectorAll('#cRows input[data-denom]')) {
      const d = Math.round(Number(inp.dataset.denom) * 100);
      const n = reste > 0 ? Math.floor(reste / d) : 0;
      reste -= n * d;
      inp.value = String(n); inp.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const cKpis = document.getElementById('cKpis').textContent;
    const texte = document.getElementById('cPistes').textContent;
    const designe = texte.includes(`n° ${base + 3}`) && /Où chercher/.test(texte);
    const resteNul = reste === 0; // la cible devait être exprimable en coupures
    window.CaisseApp.showPanel('panelSaisie');
    void cKpis;
    reg.opening.amount = ouvertureAvant; await S.saveReg(); S.renderJournal();
    // Ctrl+Entrée sur la fiche enregistre la pièce
    const avantRaccourci = reg.pieces.length;
    document.getElementById('pNo').value = '299';
    document.getElementById('pDate').value = `${reg.annee}-05-20`;
    document.getElementById('pType').value = 'FRAIS'; document.getElementById('pType').dispatchEvent(new Event('change'));
    document.getElementById('pPersonne').value = 'S. Monod';
    document.getElementById('pCompte').value = '51000.3185.00';
    document.getElementById('pMontant').value = '18.50';
    document.getElementById('pMontant').dispatchEvent(new Event('input'));
    document.getElementById('pDetail').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    await new Promise((r) => setTimeout(r, 900));
    const parRaccourci = reg.pieces.length - avantRaccourci;
    const piece299 = reg.pieces.find((p) => p.no === 299);
    const montant299 = piece299 ? piece299.montant : null;
    // le bloc rend le registre tel qu'il l'a trouvé : les blocs suivants comptent dessus
    for (const no of [base + 1, base + 3, 299]) {
      const p = reg.pieces.find((x) => x.no === no);
      if (p) R.removePiece(reg, p.id);
    }
    if (els0) els0.value = '';
    await S.saveReg(); S.renderJournal();
    const registreRendu = reg.pieces.length === avant && R.nextNo(reg) === nextAvant;
    return { avant, toutes, parNom, parNo, parNoCible, parNoPropre, rien, messageVide, apresVidage, pendantes, trouVu, designe, resteNul, parRaccourci, montant299, registreRendu };
  });
  console.log('retrouver & contrôler :', JSON.stringify(rc));
  ok = ok && rc.parNom === 1 && rc.parNo >= 1 && rc.parNoCible && rc.parNoPropre && rc.rien === 0 && rc.messageVide
    && rc.apresVidage === rc.toutes && rc.pendantes < rc.toutes
    && rc.trouVu && rc.resteNul && rc.designe && rc.parRaccourci === 1 && rc.montant299 === 18.5
    && rc.registreRendu;

  // Relevé de caisse : le formulaire officiel, rempli depuis le comptage à l'écran (pas besoin
  // de l'avoir enregistré), avec le rapprochement et les deux visas.
  const releve = await win.evaluate(async () => {
    const R = window.CaisseRegistre; const S = window.CaisseSaisie; const reg = S.state.reg;
    const visasAvant = reg.visas;
    reg.visas = { responsable: 'A. Berger', boursier: 'Ch. Dupraz' };
    const counts = { 1000: 0, 200: 3, 100: 7, 50: 21, 20: 69, 10: 36, 5: 38, 2: 17, 1: 13, 0.5: 89, 0.2: 28, 0.1: 51, 0.05: 34 };
    const t = R.countTotal(counts);
    const date = `${reg.annee}-02-27`;
    const mouv = R.periodMovements(reg, null, date);
    const res = await window.CaissePdf.buildReleveCaissePdf(
      { date, counts, billets: t.billets, pieces: t.pieces, total: t.total, note: '' }, reg,
      { reference: { date: reg.opening.date, total: reg.opening.amount }, encaissements: mouv.encaissements, decaissements: mouv.decaissements,
        ecart: Math.round((t.total - R.balanceAt(reg, date)) * 100) / 100 },
    );
    reg.visas = visasAvant;
    // le bouton existe et réagit sur un comptage vide en le refusant plutôt qu'en produisant un PDF creux
    window.CaisseApp.showPanel('panelCaisse');
    document.getElementById('btnCountNew').click();
    document.getElementById('btnReleve').click();
    await new Promise((r) => setTimeout(r, 300));
    const refus = /rien . mettre sur le relev|Aucun billet/.test(document.getElementById('countNotices').textContent);
    document.getElementById('countNotices').innerHTML = '';
    window.CaisseApp.showPanel('panelSaisie');
    return { pages: res.pages, total: res.total, octets: res.bytes.length, refus, boutonLa: !!document.getElementById('btnReleve') };
  });
  console.log('relevé de caisse :', JSON.stringify(releve));
  ok = ok && releve.boutonLa && releve.pages === 1 && releve.total === 4383.9 && releve.octets > 1000 && releve.refus;

  // Liste déroulante des comptes : tous les comptes connus, filtrables, parcourables au clavier,
  // et le champ reste libre pour un numéro qu'on ne connaît pas encore.
  const liste = await win.evaluate(async () => {
    const champ = document.getElementById('pCompte');
    const pop = () => champ.parentElement.querySelector('.combo-pop');
    const lignes = () => Array.from(pop().querySelectorAll('.combo-item'));
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    const taper = async (t) => { champ.value = t; champ.dispatchEvent(new Event('input', { bubbles: true })); await pause(60); };

    champ.parentElement.querySelector('.combo-arrow').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await pause(80);
    const ouverte = !pop().classList.contains('hidden');
    const total = lignes().length;
    const defile = pop().scrollHeight > pop().clientHeight + 1; // elle doit défiler, pas déborder
    const enTete = lignes()[0].querySelector('b').textContent;

    await taper('3662');
    const parNumero = lignes().length;
    await taper('camp'); // on cherche aussi par ce à quoi le compte sert
    const parUsage = lignes().length;
    await taper('zzzz');
    const messageVide = !!pop().querySelector('.combo-vide');

    // clavier : la liste se parcourt et se choisit sans la souris, et se referme après le choix
    await taper('');
    champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await pause(60);
    champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await pause(120);
    const apresChoix = { valeur: champ.value, fermee: pop().classList.contains('hidden') };

    // un compte inconnu se tape quand même : le champ n'impose pas la liste
    await taper('12345.6789.00');
    champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await pause(60);
    const libre = champ.value;
    await taper('');
    const autres = ['pClasse', 'pPersonne', 'regCaisse'].every((id) => document.getElementById(id).parentElement.classList.contains('combo'));
    return { ouverte, total, defile, enTete, parNumero, parUsage, messageVide, apresChoix, libre, autres };
  });
  console.log('liste des comptes :', JSON.stringify(liste));
  ok = ok && liste.ouverte && liste.total >= 20 && liste.defile && /^\d/.test(liste.enTete)
    && liste.parNumero > 0 && liste.parNumero < liste.total
    && liste.parUsage > 0 && liste.parUsage < liste.total
    && liste.messageVide && liste.apresChoix.fermee && /^\d/.test(liste.apresChoix.valeur)
    && liste.libre === '12345.6789.00' && liste.autres;

  // Toutes les listes de l'application sont la même liste déroulante : les listes fermées du
  // navigateur (type, objet, année, PDF depuis le n°) comme les champs libres.
  const partout = await win.evaluate(async () => {
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    const champDe = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      if (el.tagName === 'SELECT') return el.previousElementSibling && el.previousElementSibling.querySelector('input');
      return el.parentElement.classList.contains('combo') ? el : null;
    };
    const libres = ['pCompte', 'pClasse', 'pPersonne', 'regCaisse', 'regVisaResp', 'regVisaBours'];
    const fermees = ['pType', 'pObjet', 'regYear', 'regPdfFrom'];
    const sansListe = libres.concat(fermees).filter((id) => !champDe(id));

    // une liste fermée montre le libellé, pas la valeur brute : « toutes les pièces », pas du vide
    const pdf = champDe('regPdfFrom');
    const montreLeLibelle = pdf && pdf.value === 'toutes les pièces' && document.getElementById('regPdfFrom').value === '';

    // mode strict : un type inventé ne reste pas
    const type = champDe('pType');
    const avant = document.getElementById('pType').value;
    type.value = 'N IMPORTE QUOI';
    type.dispatchEvent(new Event('input', { bubbles: true }));
    type.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    await pause(120);
    const strictTenu = document.getElementById('pType').value === avant && type.value === avant;

    // mode libre : un compte inconnu se garde
    const compte = champDe('pCompte');
    compte.value = '77777.8888.99';
    compte.dispatchEvent(new Event('input', { bubbles: true }));
    compte.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    await pause(120);
    const libreTenu = compte.value === '77777.8888.99';
    compte.value = ''; compte.dispatchEvent(new Event('input', { bubbles: true }));
    return { sansListe, montreLeLibelle, strictTenu, libreTenu };
  });
  console.log('listes partout :', JSON.stringify(partout));
  ok = ok && partout.sansListe.length === 0 && partout.montreLeLibelle && partout.strictTenu && partout.libreTenu;

  // Tableau des pièces scannées : le champ où l'on corrige un compte mal lu a sa liste, et les
  // comptes réellement lus sur la pièce y passent devant.
  const tableau = await win.evaluate(async () => {
    const A = window.CaisseApp;
    const w = (str, x, y) => ({ str, x, y, h: 10 });
    const an = window.CaisseSaisie.state.reg.annee;
    const mots = [w('PIECE', 79, 82), w('COMPTABLE', 114, 82), w('42', 349, 79), w('DOIT', 79, 114), w('SOMME', 338, 112), w('AVOIR', 410, 112), w('Libellé', 342, 220), w('Total', 78, 390),
      w('52000.3662.00', 155, 142), w('CHF', 332, 142), w('88.00', 356, 142), w('9100.104', 454, 142), w('CHF', 332, 388), w('88.00', 356, 388),
      w('AVANCE', 78, 261), w('camp', 118, 261), w('L.', 78, 275), w('Duvernay', 118, 275), w(`01.05.${an}`, 56, 425)];
    A.state.pages = [{ docId: 'd', pageInDoc: 1, pageNumber: 1, width: 595, height: 842, words: mots }];
    A.state.entries = []; A.reparse(); A.refreshAll();
    await new Promise((r) => setTimeout(r, 400));
    const inp = document.querySelector('#panelScan input[data-field="compte"]');
    const aSaListe = !!(inp && inp.parentElement.classList.contains('combo'));
    let lignes = []; let luDevant = false;
    if (aSaListe) {
      inp.parentElement.querySelector('.combo-arrow').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
      lignes = Array.from(inp.parentElement.querySelectorAll('.combo-item')).map((e) => e.textContent.replace(/\s+/g, ' ').trim());
      luDevant = /lu sur la pièce/.test(lignes[0] || '');
      inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }
    await window.CaisseApp.retirerDuJournal();
    A.state.pages = []; A.state.entries = []; A.reparse(); A.refreshAll();
    window.CaisseApp.showPanel('panelSaisie');
    return { aSaListe, combien: lignes.length, premiere: lignes[0] || '', luDevant };
  });
  console.log('comptes du tableau :', JSON.stringify(tableau));
  ok = ok && tableau.aSaListe && tableau.combien > 5 && tableau.luDevant;

  // Espace « Données » : ce qu'on y ajoute apparaît dans les listes de la fiche, ce qu'on en
  // retire en disparaît, et le carnet est bien écrit dans les fichiers de l'application — c'est
  // ce qui fait qu'une classe créée une fois est là au prochain démarrage.
  const donnees = await win.evaluate(async () => {
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    const K = window.CaisseCarnet;
    const A = window.CaisseApp;
    const avant = K.serialize(K.actuel());
    const ouvrir = async (id) => {
      const inp = document.getElementById(id);
      inp.parentElement.querySelector('.combo-arrow').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await pause(180);
      const lignes = Array.from(inp.parentElement.querySelectorAll('.combo-item')).map((e) => e.textContent.replace(/\s+/g, ' ').trim());
      inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await pause(60);
      return lignes;
    };

    A.showPanel('panelDonnees');
    await pause(250);
    const cartes = Array.from(document.querySelectorAll('[data-carte]')).map((e) => e.dataset.carte);

    // 1. ajouter une classe qui n'existe nulle part
    document.getElementById('d-classes-val').value = '12VG/2';
    document.querySelector('[data-ajouter="classes"]').click();
    await pause(350);
    const ajoutee = K.ajoutsDe(K.actuel(), 'classes').some((x) => x.valeur === '12VG/2');
    const classeProposee = (await ouvrir('pClasse')).some((t) => t.includes('12VG/2'));

    // 2. retirer un compte dont aucune pièce de l'année ne se sert (pas de question posée)
    const libre = Array.from(document.querySelectorAll('[data-carte="comptes"] .dligne'))
      .find((l) => !l.querySelector('.dn'));
    const cible = libre ? libre.querySelector('[data-retirer]').dataset.valeur : '';
    const avantRetrait = (await ouvrir('pCompte')).some((t) => t.includes(cible));
    if (libre) libre.querySelector('[data-retirer]').click();
    await pause(350);
    const apresRetrait = (await ouvrir('pCompte')).some((t) => t.includes(cible));

    // 3. le carnet est écrit dans les fichiers de l'application
    let ecrit = '';
    try { ecrit = (await window.CaisseFiles.loadCarnet()) || ''; } catch (e) { ecrit = ''; }
    const garde = ecrit.includes('12VG/2') && (!cible || ecrit.includes(cible));

    // 4. remettre le compte retiré : il revient dans la liste
    const chip = document.querySelector('[data-remettre="comptes"]');
    if (chip) chip.click();
    await pause(350);
    const remis = (await ouvrir('pCompte')).some((t) => t.includes(cible));

    // 5. décrire ce compte (intégré) par « Modifier » : la description s'affiche dans la fiche
    const mod = document.querySelector(`[data-carte="comptes"] [data-modifier][data-valeur="${cible}"]`);
    if (mod) mod.click();
    await pause(100);
    if (document.getElementById('d-edit')) {
      document.getElementById('d-edit').value = 'Camps (essai)';
      document.querySelector('[data-edit-ok]').click();
    }
    await pause(350);
    const decrit = (await ouvrir('pCompte')).some((t) => t.includes(cible) && t.includes('Camps (essai)'));

    // 6. « Annuler » défait ce dernier changement
    const annuler = document.querySelector('[data-carte="comptes"] [data-annuler]');
    if (annuler) annuler.click();
    await pause(350);
    const annule = !!annuler && !K.noteDe(K.actuel(), 'comptes', cible);

    // on laisse le PC comme on l'a trouvé
    K.poser(K.parse(avant));
    try { await window.CaisseFiles.saveCarnet(avant); } catch (e) { /* ignore */ }
    window.CaisseDonnees.rendre();
    window.CaisseSaisie.majListes();
    A.showPanel('panelSaisie');
    await pause(150);
    const nettoye = !(await ouvrir('pClasse')).some((t) => t.includes('12VG/2'));
    return { cartes, ajoutee, classeProposee, cible, avantRetrait, apresRetrait, garde, remis, decrit, annule, nettoye };
  });
  // Boîte de réception : la chaîne entière du copieur. On imprime trois fiches marquées, on en
  // fait une pile (c'est ce que produit le copieur quand on lui passe le tas signé), on la dépose
  // dans un dossier surveillé, et on vérifie que chaque document retrouve SA pièce.
  const reception = await (async () => {
    // trois pièces neuves, et la pile de leurs fiches
    const pile = await win.evaluate(async () => {
      const R = window.CaisseRegistre; const S = window.CaisseSaisie; const reg = S.state.reg;
      const faites = [];
      // la première est un décompte de camp « à faire » : son scan doit se poser dans le bac
      const modeles = [
        { type: 'DECOMPTE', objet: 'Camp', classe: '9S', detail: 'camp de Leysin', decompteAFaire: true },
        { type: 'FRAIS', objet: 'Matériel', detail: 'pile 2' },
        { type: 'FRAIS', objet: 'Matériel', detail: 'pile 3' },
      ];
      for (let i = 0; i < 3; i++) {
        const p = R.newPiece(reg);
        Object.assign(p, { no: 900 + i, date: `${reg.annee}-04-0${i + 1}`,
          personne: 'T. Morel', compte: '51000.3185.00', montant: 10 + i, sens: 'credit' }, modeles[i]);
        p.libelle = R.composeLibelle(p);
        R.upsertPiece(reg, p);
        faites.push({ id: p.id, no: p.no });
      }
      await S.saveReg();
      const pieces = faites.map((f) => reg.pieces.find((p) => p.id === f.id));
      const { bytes, pages } = await window.CaissePdf.buildPdf(pieces, reg, () => null);
      return { annee: reg.annee, faites, pages, octets: Array.from(bytes) };
    });

    // Le dossier de l'application : c'est là que le copieur envoie, sans rien régler. On y dépose
    // la pile comme le ferait le copieur, et on vérifie que l'application l'y prend d'elle-même.
    const regle = await win.evaluate(async () => {
      await window.CaisseScan.regler({ scanDossiers: [], scanActif: true, scanAuto: false });
      const e = await window.CaisseScan.etat();
      return { depot: e.depot, depotReseau: e.depotReseau, dossiers: e.dossiers.map((d) => d.chemin), auto: e.auto, actif: e.actif, enMarche: e.veilleEnMarche };
    });
    const scanDir = regle.depot;
    if (!scanDir || !fs.existsSync(scanDir)) throw new Error(`dossier de dépôt absent : ${scanDir}`);
    // La veille tourne. Elle ne démarre plus sur un minuteur posé au lancement, mais quand cette
    // page a fini de charger : c'est elle qui lit les piles, et un scan confié trop tôt partait
    // dans le vide, pour finir « à revoir » dix minutes plus tard sans avoir été lu.
    if (!regle.enMarche) throw new Error('la veille du dossier scanné ne tourne pas');

    // Un nom de justificatif ne désigne jamais un dossier : « .. » ressortait tel quel de
    // safeName() et visait le dossier parent des pièces.
    const noms = await win.evaluate(async () => {
      const an = window.CaisseSaisie.state.reg.annee;
      const id = window.CaisseSaisie.state.reg.pieces[0].id;
      const octets = new Uint8Array([1, 2, 3]);
      const pose = await window.CaisseFiles.attach(an, id, '..', octets);
      // sans la garde, cette lecture vise le dossier des pièces et lève EISDIR : on veut que le
      // test échoue sur le nom, qui dit ce qui ne va pas, pas sur l'erreur système
      let relu = null; let erreur = '';
      try { const b = await window.CaisseFiles.read(an, id, '..'); relu = b ? b.length : null; }
      catch (e) { erreur = String((e && e.message) || e); }
      try { await window.CaisseFiles.remove(an, id, pose.name); } catch (e) { /* rien à retirer */ }
      return { pose: pose.name, relu, erreur };
    });
    console.log('nom de justificatif hostile :', JSON.stringify(noms));
    if (noms.pose === '..' || noms.pose.includes('..')) throw new Error(`« .. » accepté comme nom de fichier : ${noms.pose}`);

    // Le dépôt et le bac vivent dans les données de l'application : ils survivent d'un essai à
    // l'autre. On efface donc ce que NOS passages précédents y ont laissé — et rien d'autre, le
    // bac pouvant contenir de vrais décomptes. Sans ça, le deuxième essai sur un même poste
    // compte les restes du premier (vu : trois fichiers « fait » au lieu d'un).
    const racineBac = await win.evaluate(() => window.CaisseScan.racineClassement());
    const aNous = (f) => /^900 /.test(f) || /SKM_C224e26040112000/.test(f);
    const balayer = (d) => {
      let entrees = [];
      try { entrees = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
      for (const e of entrees) {
        const complet = path.join(d, e.name);
        if (e.isDirectory()) balayer(complet);
        else if (aNous(e.name)) fs.rmSync(complet, { force: true });
      }
    };
    balayer(racineBac);
    balayer(scanDir);

    fs.writeFileSync(path.join(scanDir, 'SKM_C224e26040112000.pdf'), Buffer.from(pile.octets));

    // deux regards espacés : un fichier n'est pris que si sa taille n'a pas bougé depuis un moment
    await win.evaluate(() => window.CaisseScan.regarder());
    await win.waitForTimeout(5200);
    const vu = await win.evaluate(() => window.CaisseScan.regarder());
    await win.waitForFunction(() => document.querySelectorAll('#receptionListe .rec').length >= 3, null, { timeout: 120000 })
      .catch(() => {});

    const boite = await win.evaluate(async () => {
      window.CaisseApp.showPanel('panelReception');
      await new Promise((r) => setTimeout(r, 300));
      const liste = await window.CaisseScan.liste();
      return {
        lignes: document.querySelectorAll('#receptionListe .rec').length,
        etats: liste.map((d) => d.etat).sort(),
        nos: liste.map((d) => (d.piece ? d.piece.no : null)).sort(),
        badge: (document.getElementById('navBadgeReception') || {}).textContent || '',
        badgeDgeo: (document.getElementById('navBadgeReceptionDgeo') || {}).textContent || '',
      };
    });

    // on valide le premier : son scan signé doit venir se joindre à SA pièce, et à aucune autre
    const jointe = await win.evaluate(async (attendu) => {
      const liste = await window.CaisseScan.liste();
      const cible = liste.find((d) => d.etat === 'trouvee' && d.piece && d.piece.no === attendu);
      if (!cible) return { erreur: 'document introuvable dans la boîte' };
      document.querySelector(`[data-joindre="${cible.id}"]`).click();
      await new Promise((r) => setTimeout(r, 1500));
      const reg = window.CaisseSaisie.state.reg;
      const p = reg.pieces.find((x) => x.id === cible.marque.id);
      const autres = reg.pieces.filter((x) => x.id !== cible.marque.id && (x.justificatifs || []).some((j) => j.name === 'piece-signee.pdf'));
      return {
        pieceNo: p ? p.no : null,
        justificatifs: p ? (p.justificatifs || []).map((j) => j.name) : [],
        contamines: autres.map((x) => x.no),
        reste: (await window.CaisseScan.liste()).length,
        racineDecomptes: await window.CaisseScan.racineClassement(),
      };
    }, pile.faites[0].no);

    // rescanner la même pièce doit REMPLACER son scan signé : le stockage par fichiers cherche
    // un nom libre quand le nom est pris, et sans précaution la pièce en accumulerait deux
    const rejoint = await win.evaluate(async (attendu) => {
      const s = window.CaisseSaisie.state;
      const p = s.reg.pieces.find((x) => x.no === attendu);
      if (!p) return { erreur: 'pièce introuvable' };
      const { bytes } = await window.CaissePdf.buildPdf([p], s.reg, () => null);
      const r = await window.CaisseReception.joindre({ marque: { annee: s.reg.annee, id: p.id }, piece: p, octets: bytes });
      await new Promise((x) => setTimeout(x, 600));
      const relu = window.CaisseSaisie.state.reg.pieces.find((x) => x.no === attendu);
      return { ok: r.ok, noms: (relu.justificatifs || []).map((j) => j.name) };
    }, pile.faites[0].no);

    // Regarder une pièce sans passer par un fichier : le trombone du journal ouvre le document
    // complet (la fiche PUIS ses justificatifs), et la liste de la fiche ouvre un justificatif
    // seul. Jusqu'ici il fallait enregistrer un PDF sur le disque pour simplement le relire.
    const documents = await win.evaluate(async (no) => {
      const S = window.CaisseSaisie; const reg = S.state.reg;
      const p = reg.pieces.find((x) => x.no === no);
      if (!p) return { erreur: 'pièce introuvable' };
      const signee = (p.justificatifs || []).find((j) => j.name === 'piece-signee.pdf');
      const octetsDe = async (url) => (url && url.startsWith('blob:') ? new Uint8Array(await (await fetch(url)).arrayBuffer()) : null);
      const tete = (o) => (o ? String.fromCharCode.apply(null, o.slice(0, 4)) : '');

      S.renderJournal();
      const clip = document.querySelector(`#journalBody tr[data-id="${p.id}"] button[data-apercu]`);
      if (!clip) return { erreur: 'le trombone du journal ne se clique pas' };
      clip.click();
      await new Promise((r) => setTimeout(r, 1500));
      const complet = await octetsDe(document.getElementById('ficheFrame').src);
      const titreComplet = (document.getElementById('fichePreviewTitre') || {}).textContent || '';
      const cadreOuvert = !document.getElementById('fichePreview').classList.contains('hidden');

      // le justificatif seul, depuis la liste de la fiche
      document.querySelector(`#journalBody tr[data-id="${p.id}"] button[data-edit]`).click();
      await new Promise((r) => setTimeout(r, 500));
      const ouvrir = document.querySelector('#pFilesList button[data-ouvrir^="saved:"]');
      if (!ouvrir) return { erreur: 'pas de bouton « ouvrir » sur le justificatif' };
      ouvrir.click();
      await new Promise((r) => setTimeout(r, 900));
      const seul = await octetsDe(document.getElementById('ficheFrame').src);
      const titreSeul = (document.getElementById('fichePreviewTitre') || {}).textContent || '';

      // Un justificatif image (la photo d'un ticket) : le cadre doit l'afficher tel quel. Annoncé
      // « application/pdf », il ne s'afficherait pas du tout — d'où le type porté par le fichier.
      const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
      const pose = await S.state.storage.attach(reg.annee, p.id, 'ticket.png', png);
      p.justificatifs.push({ name: pose.name, size: pose.size, kind: 'png' });
      await S.saveReg();
      S.renderJournal();
      document.querySelector(`#journalBody tr[data-id="${p.id}"] button[data-edit]`).click();
      await new Promise((r) => setTimeout(r, 500));
      const bImage = document.querySelector(`#pFilesList button[data-ouvrir="saved:${pose.name}"]`);
      let image = { bouton: !!bImage, type: '', taille: 0 };
      if (bImage) {
        bImage.click();
        await new Promise((r) => setTimeout(r, 700));
        const url = document.getElementById('ficheFrame').src;
        const blob = url.startsWith('blob:') ? await (await fetch(url)).blob() : null;
        image = { bouton: true, type: blob ? blob.type : '', taille: blob ? blob.size : 0, attendu: png.length };
      }
      return {
        image,
        cadreOuvert, titreComplet, titreSeul,
        completPdf: tete(complet) === '%PDF', seulPdf: tete(seul) === '%PDF',
        // le document complet porte la fiche EN PLUS du scan : il est forcément plus gros
        completTaille: complet ? complet.length : 0,
        seulTaille: seul ? seul.length : 0,
        seulEstLeFichier: !!(seul && signee && seul.length === signee.size),
      };
    }, pile.faites[0].no);

    // le scan d'origine a été rangé, pas détruit
    const ranges = [];
    const parcourir = (dir, prefixe) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = prefixe ? `${prefixe}/${e.name}` : e.name;
        if (e.isDirectory()) parcourir(path.join(dir, e.name), rel);
        else ranges.push(rel);
      }
    };
    parcourir(scanDir, '');

    // Le bac à courrier : le décompte « à faire » de la pile doit s'être posé dans son dossier.
    const bac = (() => {
      const racine = jointe.racineDecomptes;
      const dossier = path.join(racine, 'À faire', 'Camp');
      let fichiers = [];
      try { fichiers = fs.readdirSync(dossier).filter((f) => /^900 /.test(f)); } catch (e) { fichiers = []; }
      return { dossier, fichiers };
    })();

    // Un chemin qui sortirait des données de l'application doit être refusé net : la page dit où
    // ranger, mais elle ne décide pas où l'on écrit sur le disque. Les deux écritures de la
    // remontée, parce que « ..\\.. » n'est un chemin que sous Windows et « ../.. » que partout.
    const evasion = await win.evaluate(async () => {
      const essais = ['../../evasion', '..\\..\\evasion', '/tmp/evasion', 'C:\\evasion', 'Décomptes/../../evasion'];
      const out = {};
      for (const e of essais) {
        try { await window.CaisseScan.poser(e, 'x.pdf', new Uint8Array([37, 80, 68, 70])); out[e] = 'accepté'; }
        catch (err) { out[e] = 'refusé'; }
      }
      return out;
    });

    // Les décomptes à faire, dans l'application : le même contenu que le dossier, lu dans le
    // registre. « Fait » doit sortir le décompte du bac — à l'écran ET dans le dossier.
    const aFaire = await win.evaluate(async (no) => {
      window.CaisseApp.showPanel('panelReception');
      await new Promise((r) => setTimeout(r, 400));
      window.CaisseReception.rendreDecomptes();
      const lignes = Array.from(document.querySelectorAll('#decomptesListe .dligne'));
      const avant = {
        combien: lignes.length,
        groupes: Array.from(document.querySelectorAll('#decomptesListe .dgroupe-t')).map((e) => e.textContent.trim().split(' ')[0]),
        signee: /signée/.test((lignes[0] || {}).textContent || ''),
        texte: ((lignes[0] || {}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
      };
      const s = window.CaisseSaisie.state;
      const p = s.reg.pieces.find((x) => x.no === no);
      document.querySelector(`[data-fait="${p.id}"]`).click();
      await new Promise((r) => setTimeout(r, 1200));
      return {
        avant,
        apres: document.querySelectorAll('#decomptesListe .dligne').length,
        encoreAFaire: !!window.CaisseSaisie.state.reg.pieces.find((x) => x.no === no).decompteAFaire,
      };
    }, pile.faites[0].no);

    const bacApres = (() => {
      const racine = jointe.racineDecomptes;
      const lire = (d) => { try { return fs.readdirSync(d).filter((f) => f.endsWith('.pdf') && /^900 /.test(f)); } catch (e) { return []; } };
      return { aFaire: lire(path.join(racine, 'À faire', 'Camp')), fait: lire(racine) };
    })();

    // le chemin est affiché en toutes lettres : c'est ce qu'on vient chercher sur cet écran
    const affiche = await win.evaluate(() => ({
      chemin: (document.getElementById('receptionDepot') || {}).textContent || '',
      note: (document.getElementById('receptionDepotNote') || {}).textContent || '',
    }));

    // on laisse le poste comme on l'a trouvé
    await win.evaluate(async () => {
      for (const d of await window.CaisseScan.liste()) await window.CaisseScan.retirer(d.id);
      await window.CaisseScan.regler({ scanDossiers: [], scanAuto: false });
      const s = window.CaisseSaisie.state;
      for (const p of s.reg.pieces.filter((x) => x.no >= 900)) window.CaisseRegistre.removePiece(s.reg, p.id);
      await s.storage.save(s.reg);
      window.CaisseSaisie.renderJournal();
      window.CaisseApp.showPanel('panelSaisie');
    });

    return { pilePages: pile.pages, regle, vu, boite, jointe, rejoint, documents, bac, aFaire, bacApres, evasion, affiche, ranges };
  })();
  console.log('boîte de réception :', JSON.stringify(reception));

  // La veille tourne TOUJOURS après avoir affiché des documents dans le cadre d'aperçu. Ce cadre
  // est un <iframe>, et l'événement qui sert à mettre la veille en pause pendant un rechargement
  // de la page se déclenche aussi pour un cadre interne : sans la garde « seulement la page
  // elle-même », le premier aperçu arrêtait la veille pour de bon, sans rien dire.
  // La Boîte de réception est listée dans les deux barres latérales. Le piège : chaque espace
  // appartenait à un outil, donc y aller depuis Décompte DGEO ramenait la barre sur Caisse
  // écoles — on sortait de l'outil sans l'avoir demandé, et le chemin d'accès disparaissait.
  const deuxChemins = await win.evaluate(async () => {
    const barre = document.getElementById('dgeoNav');
    const depuisDgeo = barre && barre.querySelector('.apptab[data-panel="panelReception"]');
    const depuisCaisse = document.getElementById('appTabs').querySelector('.apptab[data-panel="panelReception"]');
    if (!depuisDgeo || !depuisCaisse) return { erreur: 'entrée absente d\'une des deux barres' };
    const ouvert = () => !document.getElementById('panelReception').classList.contains('hidden');
    const outil = () => (document.getElementById('dgeoNav').classList.contains('hidden') ? 'caisse' : 'dgeo');

    // on passe à Décompte DGEO, puis on ouvre la Boîte de réception depuis SA barre
    document.querySelector('#toolMenu button[data-tool="dgeo"]').click();
    await new Promise((r) => setTimeout(r, 250));
    const outilAvant = outil();
    depuisDgeo.click();
    await new Promise((r) => setTimeout(r, 250));
    const depuisDgeoOk = { ouvert: ouvert(), outil: outil(), marque: depuisDgeo.classList.contains('active') };

    // et depuis Caisse écoles, on reste côté caisse
    document.querySelector('#toolMenu button[data-tool="caisse"]').click();
    await new Promise((r) => setTimeout(r, 250));
    depuisCaisse.click();
    await new Promise((r) => setTimeout(r, 250));
    const depuisCaisseOk = { ouvert: ouvert(), outil: outil(), marque: depuisCaisse.classList.contains('active') };

    window.CaisseApp.showPanel('panelSaisie');
    return { outilAvant, depuisDgeo: depuisDgeoOk, depuisCaisse: depuisCaisseOk };
  });
  console.log('Boîte de réception des deux côtés :', JSON.stringify(deuxChemins));
  if (deuxChemins.erreur) throw new Error(deuxChemins.erreur);
  if (deuxChemins.outilAvant !== 'dgeo') throw new Error('le passage à Décompte DGEO n\'a pas eu lieu');
  if (!deuxChemins.depuisDgeo.ouvert || !deuxChemins.depuisDgeo.marque) throw new Error('la Boîte de réception ne s\'ouvre pas depuis la barre de Décompte DGEO');
  if (deuxChemins.depuisDgeo.outil !== 'dgeo') throw new Error('y aller depuis Décompte DGEO fait sortir de l\'outil');
  if (!deuxChemins.depuisCaisse.ouvert || !deuxChemins.depuisCaisse.marque) throw new Error('la Boîte de réception ne s\'ouvre pas depuis la barre de Caisse écoles');
  if (deuxChemins.depuisCaisse.outil !== 'caisse') throw new Error('y aller depuis Caisse écoles fait sortir de l\'outil');

  const apresApercu = await win.evaluate(async () => (await window.CaisseScan.etat()).veilleEnMarche);
  console.log('la veille survit à un aperçu :', apresApercu);
  if (!apresApercu) throw new Error('la veille s\'est arrêtée après l\'affichage d\'un document dans le cadre');
  ok = ok && reception.pilePages === 3
    && reception.regle.dossiers.length === 0 && reception.regle.auto === false
    && /[\\/]Scans$/.test(reception.regle.depot)
    && reception.affiche.chemin === reception.regle.depot
    && reception.affiche.note.length > 20
    && reception.boite.lignes === 3 && reception.boite.etats.join('|') === 'trouvee|trouvee|trouvee'
    && reception.boite.badge === '3' && reception.boite.badgeDgeo === '3'
    && reception.jointe.justificatifs.includes('piece-signee.pdf')
    && reception.jointe.contamines.length === 0
    && reception.jointe.reste === 2
    && reception.bac.fichiers.length === 1 && /^900 /.test(reception.bac.fichiers[0]) && /\.pdf$/.test(reception.bac.fichiers[0])
    && reception.documents.cadreOuvert && reception.documents.completPdf && reception.documents.seulPdf
    && /n° 900/.test(reception.documents.titreComplet) && /justificatif/.test(reception.documents.titreComplet)
    && reception.documents.completTaille > reception.documents.seulTaille
    && reception.documents.seulEstLeFichier && reception.documents.titreSeul === 'piece-signee.pdf'
    && reception.documents.image.bouton && reception.documents.image.type === 'image/png'
    && reception.documents.image.taille === reception.documents.image.attendu
    && Object.values(reception.evasion).every((v) => v === 'refusé')
    && reception.aFaire.avant.combien === 1 && reception.aFaire.avant.signee
    && reception.aFaire.avant.groupes.join('|') === 'Camp'
    && reception.aFaire.apres === 0 && reception.aFaire.encoreAFaire === false
    && reception.bacApres.aFaire.length === 0 && reception.bacApres.fait.length === 1
    && reception.rejoint.ok && reception.rejoint.noms.filter((n) => n === 'piece-signee.pdf').length === 1
    && reception.rejoint.noms.length === 1
    && reception.ranges.some((f) => f.startsWith('traité/'))
    && !reception.ranges.some((f) => /^SKM_/.test(f));

  console.log('espace données :', JSON.stringify(donnees));
  ok = ok && donnees.cartes.length === 5 && donnees.ajoutee && donnees.classeProposee
    && donnees.cible && donnees.avantRetrait && !donnees.apresRetrait && donnees.garde
    && donnees.remis && donnees.decrit && donnees.annule && donnees.nettoye;

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
    return { total: c.total, billets: c.billets, pieces: c.pieces, kpis, rows: document.querySelectorAll('#countBody tr[data-id]').length, storedCounts: stored ? stored.comptages.length : null, book: window.CaisseRegistre.balanceAt(s.reg, c.date),
      surligne: !!document.querySelector(`#countBody tr.selected[data-id="${c.id}"]`) };
  });
  console.log('comptage :', totalTxt, JSON.stringify(count));
  // Après l'enregistrement, le formulaire repart d'un comptage neuf : le comptage enregistré devient
  // le « dernier solde compté » (1re tuile) et reste surligné dans l'historique.
  ok = ok && totalTxt === '341.55' && count.total === 341.55 && count.billets === 340 && count.pieces === 1.55 && count.rows >= 1 && count.kpis.length === 5 && count.kpis[0] === '341.55'
    && count.surligne && (count.storedCounts === null || count.storedCounts === count.rows);
  // Un second comptage s'ajoute au lieu de remplacer le premier ; un enregistrement impossible le
  // dit dans le comptage même, et ne l'inscrit pas à l'historique.
  const second = await win.evaluate(async () => {
    const s = window.CaisseSaisie.state; const n0 = s.reg.comptages.length;
    const compter = async () => {
      const inp = document.querySelector('#cRows input[data-denom="10"]'); inp.value = '4'; inp.dispatchEvent(new Event('input', { bubbles: true }));
      document.getElementById('btnCountSave').click();
      for (let i = 0; i < 50 && document.getElementById('cTotal').textContent !== '0.00' && !document.querySelector('#countErrors .notice'); i++) await new Promise((r) => setTimeout(r, 100));
    };
    await compter();
    const garde = s.reg.comptages.length === n0 + 1;
    const vrai = s.storage.save;
    s.storage.save = async () => { throw new Error('serveur injoignable (essai)'); };
    try { await compter(); } finally { s.storage.save = vrai; }
    const dit = /pas enregistré/.test(document.getElementById('countErrors').textContent) && /injoignable/.test(document.getElementById('countErrors').textContent);
    const resteAffiche = document.getElementById('cTotal').textContent === '40.00';
    // les messages de cet essai s'en vont : le bloc « enregistrement impossible » plus bas doit trouver les siens
    for (const n of document.querySelectorAll('.notice.err')) if (/injoignable \(essai\)/.test(n.textContent)) n.remove();
    return { garde, dit, pasInscrit: s.reg.comptages.length === n0 + 1, resteAffiche };
  });
  console.log('deux comptages, puis un échec :', JSON.stringify(second));
  ok = ok && second.garde && second.dit && second.pasInscrit && second.resteAffiche;
  await win.evaluate(async () => { const s = window.CaisseSaisie.state; for (let i = 0; i < 2; i++) window.CaisseRegistre.removeCount(s.reg, s.reg.comptages[s.reg.comptages.length - 1].id); await s.storage.save(s.reg); window.CaisseComptage.newCount(); window.CaisseComptage.render(); window.CaisseApp.showPanel('panelSaisie'); });
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
  // DEUX POSTES SUR LE MÊME REGISTRE. Avec les données sur le serveur, un collègue peut écrire
  // dans l'année pendant qu'on y travaille. On le simule en écrivant nous-mêmes dans le fichier du
  // registre, comme le ferait l'autre poste, puis on enregistre depuis l'application : sans la
  // fusion, la pièce du « collègue » disparaissait sous la nôtre, sans un mot.
  {
    const RR = require('../src/registre.js');
    const avantDeux = await win.evaluate(async () => {
      const S = window.CaisseSaisie;
      await S.saveReg(); // l'écran et le disque partent du même point
      const e = await window.CaisseEmplacement.etat();
      return { annee: S.state.reg.annee, dir: await window.CaisseFiles.dir(), etat: e, carte: !document.getElementById('carteEmplacement').classList.contains('hidden') };
    });
    // COMPTA_DONNEES posé : tout ce test tourne avec les données ailleurs que dans le profil, comme
    // sur le serveur. Sinon, elles doivent être restées sur le poste.
    const voulu = process.env.COMPTA_DONNEES ? path.resolve(process.env.COMPTA_DONNEES) : null;
    console.log('où sont les données :', JSON.stringify({ partage: avantDeux.etat.partage, chemin: avantDeux.etat.chemin, registres: avantDeux.dir }));
    if (!!avantDeux.etat.partage !== !!voulu) throw new Error(`données ${avantDeux.etat.partage ? 'partagées' : 'sur le poste'} alors que ${voulu ? 'COMPTA_DONNEES les envoie ailleurs' : 'rien ne le demande'}`);
    if (voulu && path.resolve(avantDeux.etat.chemin) !== voulu) throw new Error(`données dans ${avantDeux.etat.chemin} au lieu de ${voulu}`);
    if (voulu && !path.resolve(avantDeux.dir).startsWith(voulu + path.sep)) throw new Error(`les registres ne suivent pas les données : ${avantDeux.dir}`);
    if (!avantDeux.carte) throw new Error('la carte « Où sont les données » n\'apparaît pas');
    const fichierReg = path.join(avantDeux.dir, String(avantDeux.annee), 'registre.json');
    const regDisque = RR.parse(fs.readFileSync(fichierReg, 'utf8'));
    const collegue = RR.newPiece(regDisque);
    Object.assign(collegue, { id: `pcollegue${Date.now().toString(36)}`, no: 777, date: `${avantDeux.annee}-04-01`, type: 'REMBOURSEMENT', detail: 'saisie du collègue', personne: 'S. Monod', compte: '51000.3185.00', montant: 7.7, sens: 'credit' });
    RR.upsertPiece(regDisque, collegue);
    fs.writeFileSync(fichierReg, RR.serialize(regDisque));

    const apres = await win.evaluate(async () => {
      const S = window.CaisseSaisie; const R = window.CaisseRegistre;
      const p = R.newPiece(S.state.reg);
      Object.assign(p, { no: 778, date: `${S.state.reg.annee}-04-02`, type: 'REMBOURSEMENT', detail: 'saisie de ce poste', personne: 'A. Berger', compte: '51000.3185.00', montant: 8.8, sens: 'credit' });
      R.upsertPiece(S.state.reg, p);
      await S.saveReg();
      const annonce = Array.from(document.querySelectorAll('.notice')).map((n) => n.textContent).find((t) => /autre poste/.test(t)) || '';
      return { enMemoire: S.state.reg.pieces.map((x) => x.no).filter((n) => n === 777 || n === 778), annonce };
    });
    const surDisque = RR.parse(fs.readFileSync(fichierReg, 'utf8')).pieces.map((x) => x.no).filter((n) => n === 777 || n === 778);
    console.log('deux postes sur le même registre :', JSON.stringify({ surDisque, enMemoire: apres.enMemoire, annonce: apres.annonce.slice(0, 90) }));
    if (!surDisque.includes(777)) throw new Error('la pièce du collègue a été écrasée par l\'enregistrement de ce poste');
    if (!surDisque.includes(778)) throw new Error('la pièce de ce poste n\'a pas été enregistrée');
    if (!apres.enMemoire.includes(777)) throw new Error('l\'écran ne montre pas la pièce du collègue après la fusion');
    if (!apres.annonce) throw new Error('la fusion s\'est faite sans le dire');

    // Un enregistrement qui échoue doit se voir : la fiche ne doit plus annoncer « enregistrée ».
    const echec = await win.evaluate(async () => {
      const S = window.CaisseSaisie;
      const vrai = S.state.storage.save;
      S.state.storage.save = async () => { throw new Error('serveur injoignable (essai)'); };
      let leve = false;
      try { await S.saveReg(); } catch (e) { leve = true; } finally { S.state.storage.save = vrai; }
      const dit = Array.from(document.querySelectorAll('.notice.err')).some((n) => /Registre non enregistré/.test(n.textContent) && /injoignable/.test(n.textContent));
      // on retire les deux pièces de l'essai
      for (const no of [777, 778]) { const x = S.state.reg.pieces.find((q) => q.no === no); if (x) window.CaisseRegistre.removePiece(S.state.reg, x.id); }
      await S.saveReg();
      S.renderJournal();
      return { leve, dit };
    });
    console.log('enregistrement impossible :', JSON.stringify(echec));
    if (!echec.leve) throw new Error('un échec d\'enregistrement passe pour une réussite');
    if (!echec.dit) throw new Error('un échec d\'enregistrement ne s\'affiche pas');
  }

  // On retire les pièces que CET essai a créées, et rien d'autre : le prochain repart du même
  // registre que celui-ci. Sans ça, le test n'est juste qu'une fois par poste.
  const menage = await win.evaluate(async (avant) => {
    const S = window.CaisseSaisie; const R = window.CaisseRegistre;
    if (!S.state.reg || S.state.reg.annee !== avant.annee) return { saute: true };
    const connues = new Set(avant.ids);
    const nouvelles = (S.state.reg.pieces || []).filter((p) => !connues.has(p.id));
    for (const p of nouvelles) R.removePiece(S.state.reg, p.id);
    await S.saveReg();
    return { retirees: nouvelles.length, reste: S.state.reg.pieces.length, attendu: avant.ids.length };
  }, avantTout);
  console.log('registre remis comme trouvé :', JSON.stringify(menage));
  // Seul un SURPLUS est un défaut : c'est lui qui fausse le tour suivant. Une pièce en moins veut
  // dire qu'on a nettoyé un reste d'un essai interrompu (numéro qui tombait sur un des nôtres),
  // et c'est très bien ainsi.
  if (!menage.saute && menage.reste > menage.attendu) {
    console.log(`ATTENTION : ${menage.reste} pièce(s) au lieu de ${menage.attendu} — le prochain essai partirait faussé`);
    ok = false;
  }

  await app.close();
  console.log(ok ? 'SMOKE OK' : 'SMOKE ÉCHEC');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
