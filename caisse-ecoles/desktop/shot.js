/*
 * Copies d'écran de chaque espace de Caisse écoles, en pleine hauteur : sert à regarder une
 * page telle qu'elle est vraiment, plutôt que telle qu'on l'imagine en lisant le HTML.
 * Le registre reçoit quelques écritures fictives pour que ce soit réaliste.
 *
 *   node desktop/shot.js [dossier de sortie]      # défaut : desktop/shots/
 */
const path = require('path');
const { _electron: electron } = require('playwright-core');
async function findPage(app, pred, t) { const t0 = Date.now(); for (;;) { for (const p of app.windows()) { try { if (pred(p.url())) return p; } catch (e) {} } if (Date.now() - t0 > (t || 30000)) throw new Error('page introuvable'); await new Promise((r) => setTimeout(r, 200)); } }
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
  const out = process.argv[2] || path.join(__dirname, 'shots');
  verifierCopie();
  require('fs').mkdirSync(out, { recursive: true });
  const app = await electron.launch({ args: [path.join(__dirname)] });
  const win = await findPage(app, (u) => /Caisse-ecoles\.html/.test(u));
  await win.setViewportSize({ width: 1440, height: 940 });
  await win.waitForFunction(() => window.CaisseSaisie && window.CaisseSaisie.state.reg, null, { timeout: 30000 });
  // un peu de matière pour que ce soit réaliste
  await win.evaluate(async () => {
    const R = window.CaisseRegistre; const S = window.CaisseSaisie;
    const an = S.state.reg.annee;
    const mk = (no, jour, type, detail, personne, compte, montant, sens) => {
      const p = R.newPiece(S.state.reg);
      Object.assign(p, { no, date: `${an}-03-${String(jour).padStart(2, '0')}`, type, detail, personne, compte, montant, sens });
      p.libelle = R.composeLibelle(p); R.upsertPiece(S.state.reg, p);
    };
    if (S.state.reg.pieces.length < 4) {
      mk(1, 3, 'REMBOURSEMENT', 'collation du chœur', 'A. Berger', '51000.3662.50', 29.7, 'credit');
      mk(2, 7, 'RECETTE', 'vente de fondues', 'T. Morel', '9206.101', 552, 'debit');
      mk(3, 12, 'PARTICIPATION DES PARENTS', 'cours de ski', 'Ch. Dupraz', '51000.4392.20', 400, 'debit');
      mk(4, 18, 'AVANCE', 'camp de Leysin', 'L. Duvernay', '52000.3662.00', 1200, 'credit');
      S.state.reg.opening.amount = 2062.2;
      await S.saveReg(); S.renderJournal();
    }
  });
  await win.waitForTimeout(600);
  for (const [panel, nom] of [['panelSaisie', 'saisie'], ['panelScan', 'scan'], ['panelAnnee', 'annee'], ['panelCaisse', 'caisse']]) {
    await win.evaluate((p) => window.CaisseApp.showPanel(p), panel);
    await win.waitForTimeout(500);
    await win.screenshot({ path: path.join(out, `${nom}.png`), fullPage: true });
    const h = await win.evaluate(() => document.body.scrollHeight);
    console.log(nom, '→ hauteur totale', h, 'px');
  }
  await app.close();
})().catch((e) => { console.error(e); process.exit(1); });
