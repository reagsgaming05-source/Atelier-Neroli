/*
 * Les droits d'un dossier qui contient du travail : le travail mis de côté (copie intégrale des documents modifiés) ne doit pas être lisible
 * par n'importe qui qui ouvre le partage.
 *
 *  - macOS, Linux : le dossier est à la personne seule (0700), ses fichiers aussi (0600).
 *  - Windows : l'héritage est coupé et seuls la personne, le système et les administrateurs gardent le contrôle (icacls, par identifiants de
 *    sécurité — ils ne dépendent ni de la langue du poste ni du nom du domaine). Sur un partage qui ne gère pas les listes de contrôle d'accès,
 *    la commande échoue : rien n'est perdu, le dossier garde les droits qu'il avait, et le journal le sait.
 *
 * Ce que cela ne fait pas : protéger contre un administrateur du serveur, ni contre quelqu'un qui lit le disque hors du système. Le contenu reste
 * en clair (le chiffrer par une clé de session est inscrit au suivi) ; le guide d'administration le dit.
 *
 * Ce module est sans Electron : la construction des arguments s'éprouve sans Windows (test/droits.test.js), l'effet réel est vérifié sur
 * Windows par smoke-test.js.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SID_SYSTEME = 'S-1-5-18', SID_ADMINISTRATEURS = 'S-1-5-32-544';

// Les arguments d'icacls : couper l'héritage, puis n'accorder le contrôle total (à ce dossier et à tout ce qu'il contiendra) qu'à ces trois-là.
function argumentsIcacls(dossier, sidPersonne) {
  if (!/^S-1-\d+(-\d+)+$/.test(sidPersonne)) throw new Error('identifiant de sécurité illisible');
  const droit = (sid) => '*' + sid + ':(OI)(CI)F';
  return [dossier, '/inheritance:r', '/grant:r', droit(sidPersonne), '/grant:r', droit(SID_SYSTEME), '/grant:r', droit(SID_ADMINISTRATEURS)];
}

// « "DOMAINE\personne","S-1-5-21-…" » → l'identifiant de sécurité de la personne qui a lancé l'application.
function sidDeLaPersonne(sortieWhoami) {
  const m = /"(S-1-\d+(?:-\d+)+)"/.exec(String(sortieWhoami || ''));
  return m ? m[1] : null;
}

// Une sonde : écrire puis relire un fichier dans le dossier, pour ne jamais laisser une personne sans accès à son propre travail.
function dossierUtilisable(dossier) {
  try {
    const sonde = path.join(dossier, 'sonde-' + process.pid + '.tmp');
    fs.writeFileSync(sonde, 'ok');
    const lu = fs.readFileSync(sonde, 'utf8');
    fs.unlinkSync(sonde);
    return lu === 'ok';
  } catch (e) { return false; }
}

/**
 * Réserve `dossier` à la personne. Rend { ok, sur } : `sur` dit comment (« posix », « acl »), ou pourquoi pas.
 * Ne lève jamais.
 */
function reserverAuProprietaire(dossier) {
  try {
    if (process.platform !== 'win32') { fs.chmodSync(dossier, 0o700); return { ok: true, sur: 'posix' }; }
    const q = spawnSync('whoami', ['/user', '/fo', 'csv', '/nh'], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
    const sid = sidDeLaPersonne(q.stdout);
    if (!sid) return { ok: false, sur: 'identifiant de sécurité introuvable' };
    const r = spawnSync('icacls', argumentsIcacls(dossier, sid), { encoding: 'utf8', windowsHide: true, timeout: 30000 });
    if (r.status !== 0) return { ok: false, sur: 'icacls a refusé (code ' + r.status + ')' };
    if (!dossierUtilisable(dossier)) {
      // Jamais de dossier fermé à la personne qui l'a créé : on rend les droits d'origine.
      spawnSync('icacls', [dossier, '/reset', '/T', '/C'], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
      return { ok: false, sur: 'le dossier n\'est plus utilisable après le changement des droits : droits d\'origine rendus' };
    }
    return { ok: true, sur: 'acl' };
  } catch (e) { return { ok: false, sur: e && e.message ? e.message : String(e) }; }
}

module.exports = { argumentsIcacls, sidDeLaPersonne, dossierUtilisable, reserverAuProprietaire, SID_SYSTEME, SID_ADMINISTRATEURS };
