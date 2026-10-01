/*
 * Le rapport de diagnostic : ce qu'on joint à une demande de support pour qu'elle
 * puisse être traitée sans venir sur place.
 *
 * Il se fabrique ICI, sur le poste, et il ne part nulle part : on l'enregistre, on le
 * relit, on le joint soi-même à un courriel. Les promesses du produit — rien ne sort,
 * des documents sensibles passent dedans — interdisent toute remontée automatique.
 *
 * Il ne contient ni nom de document, ni contenu, ni nom de personne : les chemins sont
 * ramenés à leur forme (« C:\Users\<utilisateur>\… »), le nom du poste et celui de
 * l'utilisateur sont remplacés, ce qui est entre guillemets dans un message d'erreur est
 * vidé, les noms de fichiers et les longues suites de chiffres (numéros AVS, IBAN,
 * références) disparaissent. Ce qu'il garde : la version, le système, le mode de
 * rangement des données, l'état de la licence, et le journal de la session, nettoyé.
 *
 * Pas d'Electron ici : s'éprouve seul (test/diagnostic.test.js).
 */

const crypto = require('crypto');

/** Une courte empreinte stable d'un nom de poste : deux rapports du même poste se reconnaissent, personne n'est nommé. */
const empreinteCourte = (s) => crypto.createHash('sha256').update(String(s || '')).digest('hex').slice(0, 6);

/**
 * Retire d'un texte ce qui pourrait nommer quelqu'un ou quelque chose.
 * ident : { utilisateur, poste } — les noms exacts de la personne et de la machine.
 */
function anonymiser(texte, ident) {
  const id = ident || {};
  let t = String(texte == null ? '' : texte);
  // Les chemins : dossier personnel, partage réseau, lecteur.
  t = t.replace(/([A-Za-z]:\\Users\\)[^\\\/\s'"]+/gi, '$1<utilisateur>');
  t = t.replace(/(\/(?:Users|home)\/)[^\/\s'"]+/g, '$1<utilisateur>');
  t = t.replace(/\\\\[^\\\s'"]+\\[^\\\s'"]+/g, '\\\\<serveur>\\<partage>');
  // Les noms exacts de la personne et de la machine, où qu'ils apparaissent.
  const echapper = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (id.utilisateur && id.utilisateur.length >= 2) t = t.replace(new RegExp(echapper(id.utilisateur), 'gi'), '<utilisateur>');
  if (id.poste && id.poste.length >= 2) t = t.replace(new RegExp(echapper(id.poste), 'gi'), '<poste>');
  // Les adresses électroniques.
  t = t.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<courriel>');
  // Ce qui est entre guillemets dans un message : un nom de champ, un mot du document.
  t = t.replace(/«[^»]*»/g, '« … »').replace(/“[^”]*”/g, '“…”').replace(/"[^"\n]{1,200}"/g, '"…"');
  // Les noms de fichiers.
  t = t.replace(/[^\s\\\/:*?"<>|«»]+\.(pdf|png|jpe?g|webp|docx?|xlsx?|odt|txt|zip)\b/gi, '<fichier>.$1');
  // Les numéros : AVS (756.xxxx.xxxx.xx), IBAN, références, tout ce qui est long en chiffres.
  t = t.replace(/\b756[.\s]?\d{4}[.\s]?\d{4}[.\s]?\d{2}\b/g, '<numéro AVS>');
  t = t.replace(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,}(?:\s?[A-Z0-9]{1,4})?\b/g, '<IBAN>');
  t = t.replace(/\d[\d\s.'’-]{5,}\d/g, (m) => (/\d{6,}/.test(m.replace(/[\s.'’-]/g, '')) ? '<nombre>' : m));
  return t;
}

/**
 * Le texte du rapport.
 *   produit : { version, canal, construction, commit }
 *   systeme : { plateforme, version, arch, electron, chrome, locale }
 *   donnees : { mode, pourquoi }           — où l'application range ses données
 *   licence : { etat, id, postes, majJusqu, joursRestants }
 *   postes  : nombre de postes ayant l'application ouverte (hors celui-ci)
 *   journal : [{ quand, niveau, contexte, msg, fois }]   — celui de la session
 *   reseau  : [{ url }]                    — requêtes que l'application s'est refusées
 *   ident   : { utilisateur, poste }
 */
function rapport(o) {
  const id = o.ident || {};
  const nettoyer = (s) => anonymiser(s, id);
  const l = [];
  const p = o.produit || {}, sy = o.systeme || {}, d = o.donnees || {}, li = o.licence || {};
  l.push('RAPPORT DE DIAGNOSTIC — Aktum PDF');
  l.push('Établi le ' + new Date(o.maintenant == null ? Date.now() : o.maintenant).toISOString().replace('T', ' ').slice(0, 19) + ' (UTC)');
  l.push('');
  l.push('Ce rapport ne contient aucun nom de document, aucun contenu de document, aucun nom de personne.');
  l.push('Il n\u2019a été envoyé nulle part : c\u2019est vous qui le joignez à votre message.');
  l.push('');
  l.push('PRODUIT');
  l.push('  version      : ' + (p.version || '?') + (p.canal ? ' (' + p.canal + ')' : ''));
  l.push('  construction : ' + (p.construction || 'version de travail') + (p.commit ? ' [' + p.commit + ']' : ''));
  l.push('');
  l.push('SYSTÈME');
  l.push('  ' + (sy.plateforme || '?') + ' ' + (sy.version || '') + ', ' + (sy.arch || '?'));
  l.push('  Electron ' + (sy.electron || '?') + ', Chromium ' + (sy.chrome || '?') + ', langue ' + (sy.locale || '?'));
  l.push('  poste        : ' + (id.poste ? 'poste-' + empreinteCourte(id.poste) : '?') + '  (empreinte du nom, pour reconnaître un même poste d\u2019un rapport à l\u2019autre)');
  l.push('');
  l.push('DONNÉES');
  l.push('  rangement    : ' + (d.mode || '?') + (d.pourquoi ? ' — ' + d.pourquoi : ''));
  if (typeof o.postes === 'number') l.push('  autres postes ayant l\u2019application ouverte : ' + o.postes);
  l.push('');
  l.push('LICENCE');
  l.push('  état         : ' + (li.etat || '?') + (li.id ? ' (' + li.id + ')' : ''));
  if (li.postes != null && li.etat === 'licence') l.push('  postes       : ' + (li.postes || 'illimités') + (li.majJusqu ? ', mises à jour jusqu\u2019au ' + li.majJusqu : ''));
  if (li.etat === 'essai') l.push('  essai        : ' + li.joursRestants + ' jours restants');
  if (li.invalide) l.push('  fichier posé non accepté : ' + nettoyer(li.invalide));
  l.push('');
  const j = Array.isArray(o.journal) ? o.journal : [];
  const graves = j.filter((x) => x.niveau !== 'info').reduce((t, x) => t + (x.fois || 1), 0);
  l.push('JOURNAL DE LA SESSION — ' + j.length + ' entrée(s), dont ' + graves + ' avertissement(s)');
  if (!j.length) l.push('  (vide)');
  j.slice(-60).forEach((x) => {
    const q = x.quand ? new Date(x.quand).toISOString().slice(11, 19) : '??:??:??';
    l.push('  ' + q + ' [' + (x.niveau || 'avert') + '] ' + nettoyer(x.contexte) + ' : ' + nettoyer(x.msg) + (x.fois > 1 ? ' (×' + x.fois + ')' : ''));
  });
  if (j.length > 60) l.push('  … ' + (j.length - 60) + ' entrée(s) plus anciennes non reprises');
  l.push('');
  const r = Array.isArray(o.reseau) ? o.reseau : [];
  l.push('CONNEXIONS REFUSÉES PAR L\u2019APPLICATION : ' + r.length + (r.length ? '' : '  (attendu : aucune)'));
  r.slice(0, 20).forEach((x) => {
    let h = '?'; try { h = new URL(x.url).host; } catch (e) { /* adresse illisible */ }
    l.push('  ' + h);
  });
  return l.join('\n') + '\n';
}

module.exports = { anonymiser, rapport, empreinteCourte };
