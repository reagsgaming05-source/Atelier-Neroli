// La chaîne d'approvisionnement tient par des fichiers qui doivent dire la même chose : la liste des bibliothèques embarquées
// (recuperer-libs.js), son manifeste d'audit (libs-manifeste/), ce que build.js lit, ce que les mentions tierces déclarent,
// les actions de la construction (épinglées) et la surveillance (Dependabot). Ici, on vérifie qu'ils s'accordent — sans réseau.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const DEPOT = path.join(RACINE, '..');
const lire = (...p) => fs.readFileSync(path.join(...p), 'utf8');
const { avisDe, evaluer, reglesInvalides } = require('../editeur/audit-dependances');

// La liste PAQUETS de recuperer-libs.js, lue dans le texte (le script récupère depuis le réseau dès qu'on le charge : on ne le charge pas).
function paquets() {
  const src = lire(RACINE, 'recuperer-libs.js');
  const bloc = src.slice(src.indexOf('const PAQUETS = ['), src.indexOf('];', src.indexOf('const PAQUETS = [')));
  return [...bloc.matchAll(/\['([^']+)', '([^']+)'\]/g)].map((m) => [m[1], m[2]]);
}
const dossierDe = (nom, version) => nom.replace(/^@/, '').replace('/', '-') + '-' + version;

test('chaque archive embarquée a son empreinte SHA-512, et il n\'y en a pas d\'autres', () => {
  const src = lire(RACINE, 'recuperer-libs.js');
  const empreintes = [...src.matchAll(/^\s*"([^"]+@[^"]+)": "(sha512-[A-Za-z0-9+/=]+)"/gm)].map((m) => m[1]);
  const attendues = paquets().map(([n, v]) => n + '@' + v);
  assert.ok(attendues.length >= 15, 'la liste des paquets doit être lue : ' + attendues.length);
  assert.deepStrictEqual(empreintes.sort(), attendues.sort());
});

test('le manifeste d\'audit dit exactement les mêmes paquets et les mêmes versions que recuperer-libs.js', () => {
  const manifeste = JSON.parse(lire(RACINE, 'libs-manifeste', 'package.json')).dependencies;
  const verrou = JSON.parse(lire(RACINE, 'libs-manifeste', 'package-lock.json'));
  const attendus = Object.fromEntries(paquets());
  assert.deepStrictEqual(manifeste, attendus);
  // Le verrou a bien résolu ces versions-là (sinon l'audit regarde autre chose que ce qui est embarqué).
  for (const [nom, version] of Object.entries(attendus)) {
    const e = verrou.packages['node_modules/' + nom];
    assert.ok(e, nom + ' manque dans package-lock.json de libs-manifeste');
    assert.strictEqual(e.version, version, nom + ' : le verrou résout ' + e.version + ', recuperer-libs.js embarque ' + version);
  }
});

test('build.js ne lit que des dossiers de libs/ que recuperer-libs.js récupère', () => {
  const dossiers = new Set(paquets().map(([n, v]) => dossierDe(n, v)));
  const lus = [...lire(RACINE, 'build.js').matchAll(/\bread\('([^'/]+)\//g)].map((m) => m[1]);
  assert.ok(lus.length >= 10, 'au moins dix lectures de libs/ : ' + lus.length);
  for (const d of lus) assert.ok(dossiers.has(d), 'build.js lit libs/' + d + ' mais recuperer-libs.js ne le récupère pas');
});

test('les mentions tierces citent les versions réellement embarquées', () => {
  const src = lire(RACINE, 'mentions-tierces.js');
  const dossiers = new Set(paquets().map(([n, v]) => dossierDe(n, v)));
  const cites = [...src.matchAll(/fichier: \['([^']+)'/g)].map((m) => m[1]);
  assert.ok(cites.length >= 8, 'les mentions citent leurs fichiers de licence : ' + cites.length);
  for (const d of cites) assert.ok(dossiers.has(d), 'mentions-tierces.js cite ' + d + ', qui n\'est pas dans la liste des paquets embarqués');
});

test('les actions de la construction sont épinglées par empreinte de commit, avec leur version en commentaire', () => {
  const dir = path.join(DEPOT, '.github', 'workflows');
  const fichiers = fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
  assert.ok(fichiers.length >= 2);
  let n = 0;
  for (const f of fichiers) {
    for (const l of lire(dir, f).split('\n')) {
      const m = l.match(/^\s*(?:-\s+)?uses:\s*(\S+)(.*)$/);
      if (!m) continue;
      n++;
      assert.match(m[1], /@[0-9a-f]{40}$/, f + ' : « ' + m[1] + ' » n\'est pas épinglée par empreinte de commit');
      assert.match(m[2], /#\s*v\d+\.\d+\.\d+/, f + ' : « ' + m[1] + ' » ne dit pas sa version lisible en commentaire');
    }
  }
  assert.ok(n >= 15, 'les utilisations d\'actions doivent être lues : ' + n);
});

test('Dependabot surveille chaque package.json du dépôt, et les actions', () => {
  const conf = lire(DEPOT, '.github', 'dependabot.yml');
  const surveilles = [...conf.matchAll(/directory:\s*(\S+)/g)].map((m) => m[1]);
  for (const d of ['/outils/libs-manifeste', '/outils/desktop', '/outils/test-e2e', '/outils', '/site', '/']) {
    assert.ok(surveilles.includes(d), 'dependabot.yml ne surveille pas ' + d);
  }
  for (const d of surveilles) {
    if (d === '/') assert.ok(/package-ecosystem:\s*github-actions/.test(conf));
    else assert.ok(fs.existsSync(path.join(DEPOT, d.slice(1), 'package.json')), d + ' n\'a pas de package.json');
  }
});

test('node-forge ne sert qu\'à lire un PKCS#12 et à fabriquer une signature : jamais à en vérifier une', () => {
  // L'avis GHSA-86w9-cpqp-85rv (vérification RSA PKCS#1 v1.5 trop tolérante, sans correctif publié) n'est acceptable que tant que c'est vrai.
  const dir = path.join(RACINE, 'src');
  const sansCommentaires = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const utilisateurs = fs.readdirSync(dir).filter((f) => f.endsWith('.js') && /\bforge\b/.test(sansCommentaires(lire(dir, f))));
  assert.ok(utilisateurs.includes('62-certificat.js'), 'le module de signature par certificat utilise forge');
  for (const f of utilisateurs) {
    assert.ok(!/\.\s*verify\s*\(/.test(sansCommentaires(lire(dir, f))), f + ' appelle verify() dans un module qui utilise node-forge');
  }
  assert.ok(/subtle\.verify/.test(lire(dir, '59-signatures.js')), 'les signatures reçues se vérifient par WebCrypto');
  assert.ok(!/\bforge\b/.test(sansCommentaires(lire(dir, '59-signatures.js'))), 'le vérificateur de signatures n\'utilise pas node-forge');
});

test('l\'audit : un avis nouveau bloque, un avis accepté passe, une exception échue rebloque', () => {
  const rapport = { vulnerabilities: {
    a: { via: [{ name: 'a', url: 'https://github.com/advisories/GHSA-aaaa-aaaa-aaaa', severity: 'high', title: 'grave' }] },
    b: { via: ['a', { name: 'b', url: 'https://github.com/advisories/GHSA-bbbb-bbbb-bbbb', severity: 'low', title: 'léger' }] },
    c: { via: [{ name: 'c', url: 'https://github.com/advisories/GHSA-cccc-cccc-cccc', severity: 'moderate', title: 'moyen' }] },
  } };
  const avis = avisDe(rapport);
  assert.strictEqual(avis.length, 3);
  const cible = { nom: 'essai', seuil: 'high' };
  const maintenant = new Date('2026-10-07');

  let r = evaluer(avis, [], cible, maintenant);
  assert.deepStrictEqual(r.bloquants.map((x) => x.id), ['GHSA-aaaa-aaaa-aaaa']);
  assert.strictEqual(r.moindres.length, 2, 'sous le seuil : affichés, pas bloquants');

  const regle = { manifeste: 'essai', paquet: 'a', id: 'GHSA-aaaa-aaaa-aaaa', raison: 'x'.repeat(50), relu: '2026-10-01', expire: '2027-03-01' };
  r = evaluer(avis, [regle], cible, maintenant);
  assert.strictEqual(r.bloquants.length, 0);
  assert.strictEqual(r.acceptes.length, 1);

  r = evaluer(avis, [regle], cible, new Date('2027-03-02'));
  assert.deepStrictEqual(r.bloquants.map((x) => x.id), ['GHSA-aaaa-aaaa-aaaa'], 'l\'exception échue ne protège plus');
  assert.strictEqual(r.expires.length, 1);

  // Une exception pour un autre manifeste, ou un autre avis, ne couvre pas celui-ci.
  assert.strictEqual(evaluer(avis, [{ ...regle, manifeste: 'ailleurs' }], cible, maintenant).bloquants.length, 1);
  assert.strictEqual(evaluer(avis, [{ ...regle, id: 'GHSA-zzzz-zzzz-zzzz' }], cible, maintenant).bloquants.length, 1);
  // Sans « id », l'exception couvre tout ce que le paquet porte.
  const { id, ...large } = regle;
  assert.strictEqual(evaluer(avis, [large], cible, maintenant).bloquants.length, 0);
});

test('editeur/avis-acceptes.json : chaque exception dit pourquoi, depuis quand, et pas plus de six mois', () => {
  const acceptes = JSON.parse(lire(RACINE, 'editeur', 'avis-acceptes.json')).avis;
  assert.ok(acceptes.length >= 1);
  assert.deepStrictEqual(reglesInvalides(acceptes), []);
  // Et l'outil sait refuser ce qui est mal formé.
  assert.ok(reglesInvalides([{ manifeste: 'm', paquet: 'p', raison: 'trop court', relu: '2026-01-01', expire: '2026-02-01' }]).length >= 1);
  assert.ok(reglesInvalides([{ manifeste: 'm', paquet: 'p', raison: 'y'.repeat(60), relu: '2026-01-01', expire: '2027-06-01' }]).length >= 1);
});

test('le SBOM CycloneDX dit chaque paquet embarqué, sa licence retenue (jamais une copyleft) et l\'empreinte relue, et il est reproductible', () => {
  const { construire, LICENCES } = require('../editeur/sbom');
  const bom = construire();
  assert.strictEqual(bom.bomFormat, 'CycloneDX');
  assert.strictEqual(bom.specVersion, '1.5');
  assert.match(bom.serialNumber, /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  const noms = new Set(bom.components.map((c) => c.name));
  for (const [nom, version] of paquets()) {
    assert.ok(LICENCES[nom], nom + ' : licence retenue non dite dans editeur/sbom.js');
    const c = bom.components.find((x) => x.name === nom);
    assert.ok(c, nom + ' manque dans le SBOM');
    assert.strictEqual(c.version, version);
    assert.ok(c.hashes.length === 1 && /^[0-9a-f]{128}$/.test(c.hashes[0].content), nom + ' : empreinte SHA-512 absente');
  }
  assert.ok(noms.has('electron'), 'Electron figure dans le SBOM');
  // Aucune licence RETENUE n'est une copyleft : c'est ce que le SBOM promet à une direction informatique.
  for (const c of bom.components) {
    const dite = JSON.stringify(c.licenses);
    assert.ok(!/GPL|AGPL|LGPL|SSPL/.test(dite), c.name + ' : licence retenue copyleft ' + dite);
  }
  // Là où npm déclare un choix (JSZip, node-forge), le SBOM garde la licence retenue ET dit ce que npm déclare.
  assert.ok(bom.components.find((c) => c.name === 'jszip').properties[0].value.includes('GPL'));
  assert.deepStrictEqual(construire(), bom, 'deux appels, le même SBOM');
});

test('les polices du site voyagent avec leur licence OFL et leurs mentions de droit d\'auteur', () => {
  const site = path.join(DEPOT, 'site');
  const source = lire(site, 'src', 'fonts', 'LICENCES.txt');
  assert.strictEqual(lire(site, 'public', 'licences-polices.txt'), source, 'public/licences-polices.txt est la copie de src/fonts/LICENCES.txt');
  for (const mot of ['Geist', 'Instrument Serif', 'SIL OPEN FONT LICENSE Version 1.1', 'Copyright 2024 The Geist Project Authors', 'Copyright 2022 The Instrument Serif Project Authors']) {
    assert.ok(source.includes(mot), 'la licence des polices du site doit contenir « ' + mot + ' »');
  }
  assert.ok(lire(site, 'src', 'app', 'mentions-legales', 'page.tsx').includes('/licences-polices.txt'), 'les mentions légales renvoient au texte des licences');
  assert.ok(lire(site, 'test', 'figer.mjs').includes('licences-polices.txt'), 'la vitrine figée emporte le fichier');
});

test('la date de construction vient du commit (ou de SOURCE_DATE_EPOCH), pas de l\'horloge : la même source donne les mêmes octets', () => {
  const src = lire(RACINE, 'build.js');
  assert.ok(src.includes('SOURCE_DATE_EPOCH'), 'build.js honore SOURCE_DATE_EPOCH');
  assert.ok(src.includes('git log -1 --format=%ct'), 'build.js lit la date du commit');
  assert.ok(/getUTCDate\(\)/.test(src) && !/\bd\.getDate\(\)/.test(src), 'les jour, mois et année se lisent en UTC (le fuseau du poste n\'y change rien)');
  // L'heure de construction n'est écrite nulle part ailleurs que dans construction.json, qui part avec la date du commit.
  assert.ok(!/new Date\(\)\.toISOString|Date\.now\(\)/.test(src.replace(/return new Date\(\);/, '')), 'aucune autre horloge dans build.js');
});
