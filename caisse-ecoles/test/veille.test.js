/*
 * La veille du dossier scanné : ce que le copieur dépose entre dans l'application tout seul.
 *
 * Les pièges éprouvés ici sont ceux du terrain, pas ceux qu'on imagine :
 *  - le copieur écrit son fichier par morceaux, et pendant quelques secondes ce qui est sur le
 *    disque est un PDF tronqué. Pire : entre deux morceaux, la taille ne bouge pas — un contrôle
 *    qui se contenterait de « la taille ne change plus » lirait un document coupé en deux ;
 *  - l'application peut tourner sur plusieurs postes à la fois sur le même dossier du serveur :
 *    un seul doit prendre un fichier donné, et aucun ne doit être perdu ;
 *  - le serveur peut devenir injoignable, un poste peut s'éteindre en plein travail ;
 *  - et dans tous les cas, le fichier d'origine n'est jamais détruit.
 *
 * Aucune donnée réelle : des PDF fabriqués pour l'occasion, des noms fictifs.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const V = require('../desktop/veille.js');
const { pdfExemple, ecrireLentement, ecrireTronque, dossierTemporaire, horlogeFactice, pause } = require('./aide-copieur.js');

/** Une veille prête à l'emploi, qui note ce qu'elle lit. */
function veille(dossier, opts) {
  opts = opts || {};
  const h = opts.horloge || horlogeFactice();
  const lus = [];
  const lignes = [];
  const v = V.creerVeille({
    dossiers: () => [{ chemin: dossier.chemin }],
    poste: opts.poste || 'POSTE-A',
    maintenant: h.maintenant,
    stabiliteMs: opts.stabiliteMs == null ? 4000 : opts.stabiliteMs,
    repriseMs: opts.repriseMs == null ? 7200000 : opts.repriseMs,
    journal: (l) => lignes.push(l),
    traiter: opts.traiter || (async (doc) => { lus.push(doc); return { ok: true }; }),
  });
  return { v, h, lus, lignes };
}

/** Plusieurs tours d'affilée, l'horloge avançant entre chacun. */
async function tours(ctx, n, pasMs) {
  const out = [];
  for (let i = 0; i < (n || 1); i++) {
    ctx.h.avancer(pasMs == null ? 10000 : pasMs);
    out.push(await ctx.v.tour());
    await pause(5);
  }
  return out;
}

/* ---------------- Le copieur écrit lentement ---------------- */

test('un fichier encore en cours d\'écriture n\'est pas lu', async () => {
  const d = dossierTemporaire('lent');
  try {
    const octets = await pdfExemple(['pièce 1', 'justificatif']);
    const ctx = veille(d);
    // Cinq morceaux, 120 ms de pause entre chacun : plusieurs tours verront la même taille deux
    // fois de suite. C'est précisément le piège — « la taille ne bouge plus » ne veut pas dire
    // « le fichier est complet ».
    const ecriture = ecrireLentement(d.fichier('scan.pdf'), octets, { tranches: 5, pauseMs: 120 });
    await tours(ctx, 8, 10000);
    assert.deepEqual(ctx.lus, [], 'un document incomplet a été lu');
    assert.ok(fs.existsSync(d.fichier('scan.pdf')), 'le fichier en cours d\'écriture a été déplacé');

    await ecriture;
    await tours(ctx, 2);
    assert.equal(ctx.lus.length, 1, 'le document complet n\'a pas été lu');
    assert.equal(ctx.lus[0].octets.length, octets.length, 'le document lu est tronqué');
    assert.deepEqual(Buffer.from(ctx.lus[0].octets), octets);
  } finally { d.jeter(); }
});

test('un PDF coupé net part « à revoir » plutôt que d\'être lu de travers', async () => {
  const d = dossierTemporaire('tronque');
  try {
    const octets = await pdfExemple(['pièce 1']);
    ecrireTronque(d.fichier('coupe.pdf'), octets, 0.3);
    const ctx = veille(d);
    // longtemps : au-delà du délai de patience, un fichier qui ne se termine jamais est écarté
    await tours(ctx, 3, 700000);
    assert.deepEqual(ctx.lus, [], 'un PDF coupé a été lu');
    const revoir = d.tout().filter((f) => f.startsWith('à revoir/'));
    assert.equal(revoir.filter((f) => f.endsWith('.pdf')).length, 1, `attendu 1 PDF à revoir, trouvé ${revoir.join(', ')}`);
    // et on dit pourquoi
    const note = revoir.find((f) => f.endsWith('.txt'));
    assert.ok(note, 'aucune note expliquant le rejet');
    assert.match(fs.readFileSync(path.join(d.chemin, note), 'utf8'), /incomplet|tronqu/i);
  } finally { d.jeter(); }
});

test('un PDF à révisions copié en deux temps n\'est pas pris pour complet à mi-chemin', async () => {
  // Le contrôle « %%EOF en queue » ne suffit pas à lui seul : un PDF modifié après coup porte un
  // %%EOF par révision. Copié depuis un autre dossier, il passe donc par un état où sa fin est
  // un vrai %%EOF alors qu'il en reste la moitié à écrire. C'est là que sert la fenêtre de
  // stabilité : on exige que la taille ne bouge plus DEPUIS UN MOMENT, pas seulement qu'elle
  // soit la même qu'au tour d'avant.
  const d = dossierTemporaire('revisions');
  try {
    const revision1 = await pdfExemple(['première version']);
    const revision2 = await pdfExemple(['version corrigée', 'page ajoutée']);
    const complet = Buffer.concat([revision1, revision2]);
    const ctx = veille(d, { stabiliteMs: 4000 });

    // premier temps : ce qui est sur le disque est un PDF valide… mais ce n'est pas le document
    fs.writeFileSync(d.fichier('scan.pdf'), revision1);
    assert.ok(revision1.toString('latin1').includes('%%EOF'), 'le morceau devrait déjà porter un %%EOF');
    await tours(ctx, 2, 1000); // deux tours rapprochés : la taille ne bouge pas, mais c'est récent
    assert.deepEqual(ctx.lus, [], 'le document a été pris alors que la copie n\'était pas finie');

    // second temps : la suite arrive
    fs.writeFileSync(d.fichier('scan.pdf'), complet);
    await tours(ctx, 6, 1000);
    assert.equal(ctx.lus.length, 1, 'le document complet n\'a pas été lu');
    assert.equal(ctx.lus[0].octets.length, complet.length, 'le document lu s\'arrête à la première révision');
  } finally { d.jeter(); }
});

/* ---------------- Plusieurs postes sur le même dossier ---------------- */

test('deux postes sur le même dossier : chaque scan est pris une fois et une seule', async () => {
  const d = dossierTemporaire('deux-postes');
  try {
    const octets = await pdfExemple(['pièce']);
    for (let i = 1; i <= 20; i++) fs.writeFileSync(d.fichier(`scan-${String(i).padStart(2, '0')}.pdf`), octets);
    const h = horlogeFactice();
    const a = veille(d, { poste: 'POSTE-A', horloge: h });
    const b = veille(d, { poste: 'POSTE-B', horloge: h });

    // les deux veillent en même temps, tours entrelacés
    for (let i = 0; i < 6; i++) {
      h.avancer(10000);
      await Promise.all([a.v.tour(), b.v.tour()]);
      await pause(5);
    }

    // Le journal des deux postes, pour que l'échec dise ce qui s'est passé plutôt que de se
    // contenter d'un compte faux — cette course ne s'est montrée que sous Windows.
    const journal = a.lignes.concat(b.lignes).filter((l) => /impossible|abandonn|à revoir|reprise/.test(l)).join('\n  ');
    const dit = journal ? `\n  ${journal}` : '';

    const pris = a.lus.concat(b.lus).map((x) => x.nom).sort();
    assert.equal(pris.length, 20, `${pris.length} document(s) traité(s) au lieu de 20${dit}`);
    assert.equal(new Set(pris).size, 20, `un même scan a été traité deux fois${dit}`);
    assert.ok(a.lus.length > 0 && b.lus.length > 0, 'un seul poste a tout pris : l\'entrelacement ne prouve rien');
    // rien ne traîne : tout est rangé
    assert.deepEqual(d.tout().filter((f) => /^scan-\d+\.pdf$/.test(f)), [], `des scans sont restés à la racine${dit}`);
    assert.equal(d.tout().filter((f) => f.startsWith('traité/')).length, 20, `tout n'est pas rangé${dit}`);
    assert.deepEqual(d.tout().filter((f) => f.startsWith('à revoir/')), [], `des scans sains sont partis « à revoir »${dit}`);
  } finally { d.jeter(); }
});

test('un poste éteint en plein travail ne retient pas le scan éternellement', async () => {
  const d = dossierTemporaire('poste-eteint');
  try {
    const octets = await pdfExemple(['pièce']);
    // un scan resté dans le dossier de travail d'un autre poste, comme après une coupure
    const orphelin = path.join(d.chemin, '.encours', 'POSTE-B');
    fs.mkdirSync(orphelin, { recursive: true });
    fs.writeFileSync(path.join(orphelin, '1700000000000-aaa-oublie.pdf'), octets);
    const ctx = veille(d, { poste: 'POSTE-A', repriseMs: 7200000 });

    // avant deux heures : ce n'est pas à nous, on n'y touche pas
    await tours(ctx, 2, 600000);
    assert.deepEqual(ctx.lus, [], 'le scan d\'un autre poste a été repris trop tôt');

    // après : le poste ne répond plus, on reprend
    await tours(ctx, 2, 4000000);
    assert.equal(ctx.lus.length, 1, 'le scan abandonné n\'a jamais été repris');
    assert.match(ctx.lignes.join('\n'), /POSTE-B/, 'la reprise devrait être notée au journal');
  } finally { d.jeter(); }
});

test('notre propre travail interrompu est repris au tour suivant', async () => {
  const d = dossierTemporaire('reprise');
  try {
    const octets = await pdfExemple(['pièce']);
    const ctx = veille(d, { poste: 'POSTE-A' });
    // ce que CETTE exécution a réservé porte sa marque : un tour ne se superposant jamais à
    // lui-même, un tel fichier ne peut être qu'un travail interrompu — on le reprend aussitôt
    const mien = path.join(d.chemin, '.encours', 'POSTE-A');
    fs.mkdirSync(mien, { recursive: true });
    fs.writeFileSync(path.join(mien, `1700000000000-${ctx.v.instance}-interrompu.pdf`), octets);
    await tours(ctx, 1);
    assert.equal(ctx.lus.length, 1, 'notre propre travail interrompu n\'a pas été repris');
    assert.match(ctx.lus[0].nom, /interrompu/);
  } finally { d.jeter(); }
});

test('l\'application ouverte deux fois sur le même PC : la seconde ne vole pas la première', async () => {
  // Deux fenêtres de Compta Blonay, c'est vite fait avec un exécutable portable. Les deux ont le
  // même nom de poste, donc le même dossier de travail. Sans marque d'exécution, la seconde
  // reprenait les scans que la première était en train de lire et les lui faisait disparaître
  // des mains — c'est exactement la panne que ce test interdit.
  const d = dossierTemporaire('deux-fenetres');
  try {
    const octets = await pdfExemple(['pièce']);
    const h = horlogeFactice();
    const un = veille(d, { poste: 'PC-BUREAU', horloge: h, graceMs: 600000 });
    const deux = veille(d, { poste: 'PC-BUREAU', horloge: h, graceMs: 600000 });
    assert.notEqual(un.v.instance, deux.v.instance, 'deux exécutions doivent se distinguer');

    // la première réserve un scan, et met du temps à le lire
    const mien = path.join(d.chemin, '.encours', 'PC-BUREAU');
    fs.mkdirSync(mien, { recursive: true });
    const enCours = path.join(mien, `${h.maintenant()}-${un.v.instance}-en-cours.pdf`);
    fs.writeFileSync(enCours, octets);

    // la seconde tourne pendant ce temps : elle ne doit pas y toucher
    await tours(deux, 3, 60000);
    assert.deepEqual(deux.lus, [], 'la seconde fenêtre a repris un scan de la première');
    assert.ok(fs.existsSync(enCours), 'le scan a disparu des mains de la première fenêtre');

    // mais si la première ne revient jamais, le scan n'est pas perdu pour autant
    await tours(deux, 2, 700000);
    assert.equal(deux.lus.length, 1, 'un scan abandonné par une fenêtre fermée reste bloqué pour toujours');
  } finally { d.jeter(); }
});

test('un fichier listé puis rangé entre-temps n\'est ni relu, ni mis « à revoir » pour rien', async () => {
  // Le contenu d'un dossier est ce qu'il était à l'instant où on l'a lu. Entre ce moment et
  // celui où on atteint un fichier, il a pu être rangé — par le tour précédent, par un autre
  // poste, par quelqu'un qui fait le ménage. Le relire le compterait deux fois ; le « mettre à
  // revoir » fabriquerait une entrée fantôme et un renommage voué à l'échec.
  const d = dossierTemporaire('liste-perimee');
  try {
    const octets = await pdfExemple(['pièce']);
    const mien = path.join(d.chemin, '.encours', 'POSTE-A');
    fs.mkdirSync(mien, { recursive: true });
    const ctx = veille(d, {
      poste: 'POSTE-A',
      traiter: async (doc) => {
        // pendant qu'on lit le premier, le second s'en va
        if (/premier/.test(doc.nom)) fs.rmSync(path.join(mien, `1700000000000-${ctx.v.instance}-second.pdf`), { force: true });
        ctx.lus.push(doc);
        return { ok: true };
      },
    });
    fs.writeFileSync(path.join(mien, `1700000000000-${ctx.v.instance}-premier.pdf`), octets);
    fs.writeFileSync(path.join(mien, `1700000000000-${ctx.v.instance}-second.pdf`), octets);

    await tours(ctx, 2);
    assert.deepEqual(ctx.lus.map((x) => x.nom), ['premier.pdf'], 'le fichier disparu a quand même été lu');
    assert.deepEqual(d.tout().filter((f) => f.startsWith('à revoir/')), [], 'une entrée fantôme a été fabriquée');
    assert.equal(d.tout().filter((f) => f.startsWith('traité/')).length, 1);
    assert.match(ctx.lignes.join('\n'), /déjà rangé/, 'le journal devrait dire qu\'il n\'y avait rien à faire');
  } finally { d.jeter(); }
});

/* ---------------- Noms, accents, doublons ---------------- */

test('accents, n° et caractères interdits ne retiennent aucun scan', async () => {
  const d = dossierTemporaire('noms');
  try {
    const octets = await pdfExemple(['pièce']);
    const noms = ['Pièce n°1.pdf', 'Décompte été.pdf', 'SKM_C224e25092210390.pdf', '____.pdf'];
    for (const n of noms) fs.writeFileSync(d.fichier(n), octets);
    const ctx = veille(d);
    await tours(ctx, 2);
    assert.equal(ctx.lus.length, noms.length, `${ctx.lus.length} scan(s) lu(s) sur ${noms.length}`);
    const ranges = d.tout().filter((f) => f.startsWith('traité/'));
    assert.equal(ranges.length, noms.length);
    // les noms rangés n'ont ni accent, ni caractère interdit sous Windows
    for (const f of ranges) {
      const base = path.basename(f);
      assert.doesNotMatch(base, /[<>:"/\\|?*]/, `nom rangé impossible sous Windows : ${base}`);
      assert.match(base, /^\d{4}-\d{2}-\d{2}_/, `le nom rangé devrait commencer par la date : ${base}`);
    }
  } finally { d.jeter(); }
});

test('deux scans du même nom ne s\'écrasent pas l\'un l\'autre', async () => {
  const d = dossierTemporaire('doublons');
  try {
    const un = await pdfExemple(['premier']);
    const deux = await pdfExemple(['deuxième', 'et sa suite']);
    const ctx = veille(d);
    fs.writeFileSync(d.fichier('SKM_C224.pdf'), un);
    await tours(ctx, 2);
    fs.writeFileSync(d.fichier('SKM_C224.pdf'), deux);
    await tours(ctx, 2);

    const ranges = d.tout().filter((f) => f.startsWith('traité/') && f.endsWith('.pdf'));
    assert.equal(ranges.length, 2, `${ranges.length} fichier(s) rangé(s) : un scan a été écrasé`);
    const tailles = ranges.map((f) => fs.statSync(path.join(d.chemin, f)).size).sort((a, b) => a - b);
    assert.deepEqual(tailles, [un.length, deux.length].sort((a, b) => a - b), 'le contenu d\'un scan a été perdu');
  } finally { d.jeter(); }
});

/* ---------------- Ce qui n'est pas à nous ---------------- */

test('seuls les PDF sont regardés : le reste du dossier n\'est pas touché', async () => {
  const d = dossierTemporaire('autres');
  try {
    const octets = await pdfExemple(['pièce']);
    fs.writeFileSync(d.fichier('scan.pdf'), octets);
    fs.writeFileSync(d.fichier('notes.txt'), 'rien à voir');
    fs.writeFileSync(d.fichier('photo.jpg'), Buffer.from([0xff, 0xd8, 0xff]));
    fs.mkdirSync(d.fichier('un dossier'));
    const ctx = veille(d);
    await tours(ctx, 2);
    assert.equal(ctx.lus.length, 1);
    const restant = d.tout();
    assert.ok(restant.includes('notes.txt'), 'un fichier étranger a été déplacé');
    assert.ok(restant.includes('photo.jpg'), 'une image a été déplacée');
    assert.ok(fs.existsSync(d.fichier('un dossier')), 'un sous-dossier a été touché');
  } finally { d.jeter(); }
});

/* ---------------- Le serveur ne répond plus ---------------- */

test('un dossier injoignable est signalé, et la veille reprend quand il revient', async () => {
  const d = dossierTemporaire('injoignable');
  try {
    const octets = await pdfExemple(['pièce']);
    const sous = path.join(d.chemin, 'partage');
    fs.mkdirSync(sous);
    const ctx = veille({ chemin: sous, tout: d.tout, fichier: (n) => path.join(sous, n) });

    fs.rmSync(sous, { recursive: true, force: true });
    const r = await tours(ctx, 2);
    assert.ok(r[0].erreurs.length > 0, 'un dossier disparu devrait être signalé');
    assert.match(ctx.lignes.join('\n'), /injoignable|introuvable/i);

    fs.mkdirSync(sous, { recursive: true });
    fs.writeFileSync(path.join(sous, 'scan.pdf'), octets);
    await tours(ctx, 2);
    assert.equal(ctx.lus.length, 1, 'la veille n\'a pas repris après le retour du dossier');
  } finally { d.jeter(); }
});

test('un dossier qui n\'a jamais existé ne retient pas le démarrage', async () => {
  const d = dossierTemporaire('absent');
  try {
    const ctx = veille({ chemin: path.join(d.chemin, 'jamais', 'vu') });
    const r = await tours(ctx, 1);
    assert.ok(r[0].erreurs.length > 0);
    assert.equal(ctx.lus.length, 0);
  } finally { d.jeter(); }
});

/* ---------------- Rien n'est jamais perdu ---------------- */

test('tout ce qui entre ressort : rangé ou à revoir, jamais détruit', async () => {
  const d = dossierTemporaire('rien-perdu');
  try {
    const bon = await pdfExemple(['pièce']);
    const entres = new Map();
    for (let i = 1; i <= 6; i++) {
      const nom = `scan-${i}.pdf`;
      // un sur trois échoue à la lecture : il doit finir « à revoir », pas disparaître
      fs.writeFileSync(d.fichier(nom), bon);
      entres.set(nom, bon.length);
    }
    let n = 0;
    const ctx = veille(d, {
      traiter: async () => { n += 1; return n % 3 === 0 ? { ok: false, raison: 'illisible' } : { ok: true }; },
    });
    await tours(ctx, 3);

    const sortis = d.tout().filter((f) => f.endsWith('.pdf'));
    assert.equal(sortis.length, entres.size, `${sortis.length} fichier(s) retrouvé(s) sur ${entres.size}`);
    for (const f of sortis) {
      assert.ok(f.startsWith('traité/') || f.startsWith('à revoir/'), `fichier resté en plan : ${f}`);
      assert.equal(fs.statSync(path.join(d.chemin, f)).size, bon.length, `contenu abîmé : ${f}`);
    }
    assert.equal(sortis.filter((f) => f.startsWith('à revoir/')).length, 2);
  } finally { d.jeter(); }
});

test('les scans rangés sont classés par mois', async () => {
  const d = dossierTemporaire('par-mois');
  try {
    const octets = await pdfExemple(['pièce']);
    fs.writeFileSync(d.fichier('scan.pdf'), octets);
    const h = horlogeFactice(Date.UTC(2026, 2, 15, 12, 0, 0));
    const ctx = veille(d, { horloge: h });
    await tours(ctx, 2, 10000);
    const range = d.tout().find((f) => f.startsWith('traité/'));
    assert.ok(range, 'rien n\'a été rangé');
    assert.match(range, /^traité\/2026-03\//, `rangé dans ${range}`);
  } finally { d.jeter(); }
});

/* ---------------- La boucle ---------------- */

test('la veille ne se superpose pas à elle-même', async () => {
  const d = dossierTemporaire('boucle');
  try {
    const octets = await pdfExemple(['pièce']);
    fs.writeFileSync(d.fichier('scan.pdf'), octets);
    let dedans = 0;
    let max = 0;
    const ctx = veille(d, {
      traiter: async () => { dedans += 1; max = Math.max(max, dedans); await pause(60); dedans -= 1; return { ok: true }; },
    });
    ctx.h.avancer(10000); await ctx.v.tour(); // premier relevé
    ctx.h.avancer(10000);
    // trois tours lancés en même temps, comme le ferait un minuteur trop pressé
    await Promise.all([ctx.v.tour(), ctx.v.tour(), ctx.v.tour()]);
    assert.equal(max, 1, `${max} lectures en parallèle : les tours se superposent`);
  } finally { d.jeter(); }
});

test('démarrer puis arrêter ne laisse rien tourner', async () => {
  const d = dossierTemporaire('arret');
  try {
    const ctx = veille(d);
    ctx.v.demarrer(20);
    await pause(80);
    ctx.v.arreter();
    const avant = ctx.v.etat().tours;
    await pause(120);
    assert.equal(ctx.v.etat().tours, avant, 'la veille tourne encore après l\'arrêt');
  } finally { d.jeter(); }
});
