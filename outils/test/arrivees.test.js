// La boîte de réception du copieur (desktop/arrivees.js), avec un vrai dossier temporaire : ce qui est annoncé, ce qui ne l'est pas encore,
// classer, supprimer, et ce que la page n'a pas le droit de demander.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Surveillance, nomLibre } = require('../desktop/arrivees.js');

const dossierTemp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'aktum-arrivees-'));
const poser = (dossier, nom, octets, ageMs) => {
  const c = path.join(dossier, nom);
  fs.writeFileSync(c, octets || 'x');
  const t = (Date.now() - (ageMs == null ? 60000 : ageMs)) / 1000;
  fs.utimesSync(c, t, t);
  return c;
};
const nettoyer = (...ds) => ds.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));

test('les documents du dossier sont listés, les autres fichiers pas, les plus récents d\'abord', async () => {
  const d = dossierTemp();
  try {
    poser(d, 'ancien.pdf', 'a', 120000);
    poser(d, 'recent.PDF', 'b', 30000);
    poser(d, 'note.txt', 'c');
    poser(d, 'plan.tiff', 'd', 90000);
    fs.mkdirSync(path.join(d, 'sous-dossier.pdf'));
    const s = new Surveillance({ onChange() {} });
    const liste = await s.demarrer(d);
    s.arreter();
    assert.deepStrictEqual(liste.map((f) => f.nom), ['recent.PDF', 'plan.tiff', 'ancien.pdf']);
  } finally { nettoyer(d); }
});

test('un fichier que le copieur écrit encore n\'est pas annoncé ; il l\'est quand il s\'est calmé', async () => {
  const d = dossierTemp();
  try {
    poser(d, 'en-cours.pdf', 'a', 500);                  // modifié il y a une demi-seconde
    let annonces = [];
    const s = new Surveillance({ stableMs: 3000, onChange: (e) => annonces.push(e) });
    await s.demarrer(d);
    assert.strictEqual(s.liste[0].stable, false);
    assert.strictEqual(annonces.length, 0, 'rien d\'annoncé tant que le fichier bouge');
    // le copieur a fini
    const t = (Date.now() - 20000) / 1000; fs.utimesSync(path.join(d, 'en-cours.pdf'), t, t);
    await s.sonder();
    s.arreter();
    assert.strictEqual(annonces.length, 1);
    assert.deepStrictEqual(annonces[0].noms, ['en-cours.pdf']);
    assert.strictEqual(annonces[0].nouveaux, 1);
  } finally { nettoyer(d); }
});

test('un fichier dont la taille change entre deux balayages n\'est pas stable, même si sa date est ancienne', async () => {
  const d = dossierTemp();
  try {
    poser(d, 'grossit.pdf', 'a', 60000);
    const s = new Surveillance({ onChange() {} });
    await s.demarrer(d);
    assert.strictEqual(s.liste[0].stable, true);
    poser(d, 'grossit.pdf', 'aaaaaaaa', 60000);
    const liste = await s.sonder();
    s.arreter();
    assert.strictEqual(liste[0].stable, false);
  } finally { nettoyer(d); }
});

test('regarder la boîte efface « nouveau » ; seuls les documents arrivés ensuite le redeviennent', async () => {
  const d = dossierTemp();
  try {
    poser(d, 'un.pdf', 'a', 60000);
    let horloge = Date.now();
    const vus = [];
    const annonces = [];
    const s = new Surveillance({ maintenant: () => horloge, onChange: (e) => annonces.push(e.nouveaux), onVu: (ts) => vus.push(ts) });
    await s.demarrer(d);
    assert.deepStrictEqual(annonces, [1]);
    horloge = Date.now() - 30000;          // la personne regarde la boîte il y a trente secondes
    s.marquerVu();
    assert.strictEqual(vus.length, 1);
    assert.ok(s.liste.every((f) => !f.nouveau));
    horloge = Date.now();
    poser(d, 'deux.pdf', 'b', 5000);       // arrivé après ce regard, et calme depuis cinq secondes
    const liste = await s.sonder();
    s.arreter();
    assert.strictEqual(annonces[annonces.length - 1], 1);
    assert.deepStrictEqual(liste.filter((f) => f.nouveau).map((f) => f.nom), ['deux.pdf']);
  } finally { nettoyer(d); }
});

test('classer déplace le document, sans jamais en écraser un autre', async () => {
  const d = dossierTemp(), dest = dossierTemp();
  try {
    poser(d, 'scan.pdf', 'premier');
    poser(dest, 'scan.pdf', 'deja-la');
    const s = new Surveillance({ onChange() {} });
    await s.demarrer(d);
    const r = s.classer('scan.pdf', dest);
    s.arreter();
    assert.strictEqual(r.ok, true);
    assert.strictEqual(path.basename(r.chemin), 'scan (2).pdf');
    assert.strictEqual(fs.readFileSync(path.join(dest, 'scan.pdf'), 'utf8'), 'deja-la', 'l\'existant n\'est pas touché');
    assert.strictEqual(fs.readFileSync(r.chemin, 'utf8'), 'premier');
    assert.ok(!fs.existsSync(path.join(d, 'scan.pdf')), 'le document a quitté la boîte');
  } finally { nettoyer(d, dest); }
});

test('classer ou supprimer un document déjà parti le dit, sans rien casser', async () => {
  const d = dossierTemp(), dest = dossierTemp();
  try {
    poser(d, 'a.pdf', 'x');
    const s = new Surveillance({ onChange() {} });
    await s.demarrer(d);
    fs.unlinkSync(path.join(d, 'a.pdf'));      // une collègue l'a classé entre-temps
    assert.match(s.classer('a.pdf', dest).erreur, /n'est plus dans la boîte/);
    assert.match(s.supprimer('a.pdf').erreur, /n'est plus dans la boîte/);
    s.arreter();
  } finally { nettoyer(d, dest); }
});

test('supprimer retire le fichier, et lui seul', async () => {
  const d = dossierTemp();
  try {
    poser(d, 'a.pdf', 'x'); poser(d, 'b.pdf', 'y');
    const s = new Surveillance({ onChange() {} });
    await s.demarrer(d);
    assert.deepStrictEqual(s.supprimer('a.pdf'), { ok: true });
    s.arreter();
    assert.deepStrictEqual(fs.readdirSync(d), ['b.pdf']);
  } finally { nettoyer(d); }
});

test('la page ne peut viser que des noms de la boîte : ni chemin, ni remontée, ni autre extension', async () => {
  const d = dossierTemp(), dehors = dossierTemp();
  try {
    poser(d, 'a.pdf', 'x');
    const secret = poser(dehors, 'secret.pdf', 'top');
    poser(d, 'texte.txt', 't');
    const s = new Surveillance({ onChange() {} });
    await s.demarrer(d);
    for (const nom of [secret, '../' + path.basename(dehors) + '/secret.pdf', '..\\x.pdf', 'sous/a.pdf', 'texte.txt', '', null, 42, {}]) {
      assert.strictEqual(s.cheminDe(nom), null, String(nom));
      assert.strictEqual(s.supprimer(nom).ok, false);
    }
    assert.ok(fs.existsSync(secret), 'rien hors de la boîte n\'a été touché');
    assert.ok(fs.existsSync(path.join(d, 'texte.txt')));
    assert.ok(s.cheminDe('a.pdf'));
    s.arreter();
  } finally { nettoyer(d, dehors); }
});

test('un dossier qui disparaît (partage coupé) donne une liste vide et le dit, sans planter', async () => {
  const d = dossierTemp();
  poser(d, 'a.pdf', 'x');
  const s = new Surveillance({ onChange() {} });
  await s.demarrer(d);
  nettoyer(d);
  const liste = await s.sonder();
  s.arreter();
  assert.deepStrictEqual(liste, []);
  assert.ok(s.erreur);
});

test('démarrer refuse ce qui n\'est pas un dossier, et arrêter vide la surveillance', async () => {
  const d = dossierTemp();
  try {
    const f = poser(d, 'a.pdf', 'x');
    const s = new Surveillance({ onChange() {} });
    assert.throws(() => s.demarrer(f));
    assert.throws(() => s.demarrer(path.join(d, 'n-existe-pas')));
    await s.demarrer(d);
    assert.strictEqual(s.actif(), true);
    s.arreter();
    assert.strictEqual(s.actif(), false);
    assert.deepStrictEqual(s.liste, []);
  } finally { nettoyer(d); }
});

test('nomLibre numérote sans écraser', () => {
  const d = dossierTemp();
  try {
    assert.strictEqual(nomLibre(d, 'x.pdf'), 'x.pdf');
    fs.writeFileSync(path.join(d, 'x.pdf'), '');
    fs.writeFileSync(path.join(d, 'x (2).pdf'), '');
    assert.strictEqual(nomLibre(d, 'x.pdf'), 'x (3).pdf');
  } finally { nettoyer(d); }
});
