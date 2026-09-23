/*
 * Où vivent les données de la caisse.
 *
 * Par défaut, dans le dossier « data » à côté de l'exécutable. Un fichier « donnees.txt » posé à
 * côté de l'exécutable peut les envoyer ailleurs — sur le serveur, typiquement :
 *
 *     \\SERVEUR\Partage\ComptaBlonay-donnees
 *
 * C'est la façon sûre de partager une caisse entre plusieurs postes. Lancer l'exécutable
 * lui-même depuis le serveur est fragile : 350 Mo relus par le réseau à chaque démarrage, un
 * programme non signé qui lance d'autres programmes depuis un partage — exactement ce que les
 * protections des serveurs d'école bloquent. Ici le programme reste sur chaque PC, et seules les
 * données voyagent.
 *
 * Ne partent que les données de la caisse. Le profil interne de Chromium (caches, stockage local,
 * verrou d'instance unique) reste sur le poste : il verrouille ses fichiers, et deux PC sur le
 * même profil se bloqueraient l'un l'autre au démarrage.
 */
'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const FICHIER = 'donnees.txt';

/** Ce que la caisse écrit elle-même, et qui part donc avec les données. */
const DOSSIERS = ['caisse', 'Scans', 'Décomptes'];

/**
 * Le dossier des données demandé, ou null. La variable d'environnement COMPTA_DONNEES passe
 * avant le fichier (pratique pour un déploiement par l'informatique, et pour les tests).
 *
 * Le fichier se tape à la main dans le Bloc-notes : on tolère ce que le Bloc-notes et
 * l'explorateur y mettent — la marque d'ordre des octets, les guillemets de « Copier en tant que
 * chemin d'accès », des lignes de commentaire commençant par #.
 */
function lireEmplacement(dossierReglage, env) {
  const e = env && env.COMPTA_DONNEES ? String(env.COMPTA_DONNEES).trim() : '';
  if (e) return { chemin: path.resolve(dossierReglage, e), source: 'COMPTA_DONNEES' };
  let texte;
  try { texte = fs.readFileSync(path.join(dossierReglage, FICHIER), 'utf8'); } catch (err) { return null; }
  const ligne = texte.replace(/^\uFEFF/, '').split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith('#'));
  if (!ligne) return null;
  const chemin = ligne.replace(/^"(.*)"$/, '$1').trim();
  return chemin ? { chemin: path.resolve(dossierReglage, chemin), source: FICHIER } : null;
}

/**
 * Le dossier est-il utilisable : existe-t-il, ou peut-on le créer, et peut-on y écrire ?
 *
 * On ne se fie pas aux droits annoncés : on écrit vraiment un petit fichier, puis on l'efface.
 * Un partage en lecture seule répond « accessible » à toutes les questions sauf celle-là.
 *
 * Un serveur éteint fait attendre Windows une demi-minute avant de répondre : passé le délai, on
 * dit « injoignable » plutôt que de laisser l'application muette.
 */
async function verifierDossier(chemin, delaiMs) {
  const essai = (async () => {
    await fsp.mkdir(chemin, { recursive: true });
    const f = path.join(chemin, `.essai-ecriture-${process.pid}-${Date.now()}.tmp`);
    await fsp.writeFile(f, 'ok');
    await fsp.unlink(f);
    return { ok: true };
  })().catch((e) => ({ ok: false, raison: `${(e && e.code) || ''} ${(e && e.message) || e}`.trim() }));
  let minuteur;
  const attente = new Promise((resolve) => {
    minuteur = setTimeout(() => resolve({ ok: false, raison: `pas de réponse en ${Math.round((delaiMs || 15000) / 1000)} s (serveur éteint, ou PC hors du réseau ?)` }), delaiMs || 15000);
  });
  try { return await Promise.race([essai, attente]); } finally { clearTimeout(minuteur); }
}

/** Écrit « donnees.txt » (ou l'efface quand `chemin` est vide : retour aux données du PC). */
function ecrireEmplacement(dossierReglage, chemin) {
  const f = path.join(dossierReglage, FICHIER);
  if (!chemin) {
    try { fs.unlinkSync(f); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    return f;
  }
  fs.writeFileSync(f, [
    '# Compta Blonay : où sont les registres, les justificatifs et les scans.',
    '# Effacez ce fichier pour revenir aux données de ce PC (dossier « data » à côté du programme).',
    chemin,
    '',
  ].join('\r\n'), 'utf8');
  return f;
}

/**
 * Emporte les données de ce poste dans le nouveau dossier — mais seulement s'il n'en contient pas
 * encore. Un dossier qui a déjà sa caisse est celle des collègues : y copier par-dessus
 * mélangerait deux registres. Les données de ce poste, elles, restent où elles sont.
 *
 * Les scans « en cours de lecture » (Scans\.encours) ne suivent pas : un autre poste les
 * reprendrait pour une lecture interrompue, et le même scan entrerait deux fois.
 */
async function copierSiVide(de, vers) {
  if (path.resolve(de) === path.resolve(vers)) return { copie: false, raison: 'même dossier' };
  if (fs.existsSync(path.join(vers, 'caisse'))) return { copie: false, raison: 'le dossier contient déjà une caisse' };
  if (!fs.existsSync(path.join(de, 'caisse'))) return { copie: false, raison: 'rien à emporter' };
  const dossiers = [];
  for (const d of DOSSIERS) {
    const src = path.join(de, d);
    if (!fs.existsSync(src)) continue;
    await fsp.cp(src, path.join(vers, d), {
      recursive: true,
      force: false,
      errorOnExist: false,
      filter: (s) => !s.split(/[\\/]/).includes('.encours'),
    });
    dossiers.push(d);
  }
  return { copie: true, dossiers };
}

module.exports = { FICHIER, DOSSIERS, lireEmplacement, verifierDossier, ecrireEmplacement, copierSiVide };
