// Qui a ce fichier ouvert, et a-t-il changé depuis qu'on l'a lu ?
//
// Le déploiement recommandé est un dossier partagé sur un lecteur réseau, avec
// plusieurs secrétaires. Deux fenêtres sur le même fichier, et la seconde à
// enregistrer remplaçait le travail de la première sans un mot — la première
// fenêtre affichant toujours « Enregistré ». La collègue croit avoir mal
// enregistré, et personne n'attribue la perte au logiciel.
//
// Deux garde-fous, qui se complètent :
//  - un verrou consultatif : un petit fichier posé à côté du document, qui dit
//    qui l'a ouvert, depuis quand, et que son détenteur rafraîchit tant qu'il
//    travaille. Il ne bloque rien : il informe, à l'ouverture, qu'une autre
//    personne l'a déjà. Un verrou qui n'est plus rafraîchi (plantage, poste
//    éteint) est tenu pour périmé et ne gêne personne.
//  - la date de modification : à l'enregistrement, on compare celle du fichier
//    à celle qu'il avait quand on l'a lu. Si elle a changé, quelqu'un a écrit
//    entre-temps : on le dit, et on demande.
//
// Rien ici ne dépend d'Electron : cela s'éprouve avec de simples fichiers.
const fs = require('fs');
const os = require('os');
const path = require('path');

// Un verrou non rafraîchi depuis ce délai est périmé. Le détenteur le rafraîchit
// chaque minute : trois minutes laissent passer un partage lent.
const PEREMPTION_MS = 3 * 60 * 1000;
const RAFRAICHIR_MS = 60 * 1000;

// Le nom visible, à côté du document : « .~verrou.décision.pdf.json ».
const nomVerrou = (chemin) => path.join(path.dirname(chemin), '.~verrou.' + path.basename(chemin) + '.json');

function lire(chemin) {
  try {
    const v = JSON.parse(fs.readFileSync(nomVerrou(chemin), 'utf8'));
    return v && typeof v === 'object' ? v : null;
  } catch (e) { return null; }
}

// Le processus existe-t-il, sur CE poste ? (Sur un autre poste on ne peut pas
// le savoir : seul le rafraîchissement dit si le verrou est vivant.)
function processusVivant(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e && e.code === 'EPERM'; }
}

function estPerime(v, maintenant, poste) {
  if (!v) return true;
  const age = (maintenant == null ? Date.now() : maintenant) - (Number(v.battement) || 0);
  if (age > PEREMPTION_MS) return true;
  // Même poste, processus disparu : plantage, inutile d'attendre trois minutes.
  if (v.poste && v.poste === (poste || os.hostname()) && v.pid && !processusVivant(v.pid)) return true;
  return false;
}

/**
 * Pose le verrou de `instance` sur ce document, sauf si quelqu'un d'autre le
 * tient vivant. Rend { pose: true } ou { pose: false, autre: { qui, poste, depuis } }.
 * Un dossier en lecture seule n'est pas une erreur : on rend { pose: false, lectureSeule: true }.
 */
function poser(chemin, qui, instance, maintenant) {
  const t = maintenant == null ? Date.now() : maintenant;
  const existant = lire(chemin);
  if (existant && existant.instance !== instance && !estPerime(existant, t)) {
    return { pose: false, autre: { qui: existant.qui || '', poste: existant.poste || '', depuis: existant.depuis || 0 } };
  }
  try {
    const v = { qui: String(qui || ''), poste: os.hostname(), pid: process.pid, instance, depuis: existant && existant.instance === instance ? existant.depuis : t, battement: t };
    fs.writeFileSync(nomVerrou(chemin), JSON.stringify(v));
    return { pose: true };
  } catch (e) { return { pose: false, lectureSeule: true }; }
}

function rafraichir(chemin, instance, maintenant) {
  const v = lire(chemin);
  if (!v || v.instance !== instance) return false;
  try { v.battement = maintenant == null ? Date.now() : maintenant; fs.writeFileSync(nomVerrou(chemin), JSON.stringify(v)); return true; }
  catch (e) { return false; }
}

// Libère le verrou, s'il est bien à nous : on n'efface jamais celui d'une collègue.
function liberer(chemin, instance) {
  const v = lire(chemin);
  if (!v || v.instance !== instance) return false;
  try { fs.unlinkSync(nomVerrou(chemin)); return true; } catch (e) { return false; }
}

/**
 * Le fichier a-t-il changé depuis qu'on l'a lu ? `attendu` est la date de
 * modification (ms) relevée à la lecture ou au dernier enregistrement. Sans
 * date attendue, on ne peut rien affirmer : pas de conflit. Un fichier qui a
 * disparu n'est pas un conflit non plus : on le recréera.
 */
function conflit(chemin, attendu) {
  if (!(Number(attendu) > 0)) return { conflit: false };
  let st;
  try { st = fs.statSync(chemin); } catch (e) { return { conflit: false }; }
  // Tolérance d'une seconde : certains partages (FAT, SMB) arrondissent les dates.
  if (Math.abs(st.mtimeMs - attendu) <= 1000) return { conflit: false, mtimeMs: st.mtimeMs };
  return { conflit: true, mtimeMs: st.mtimeMs, taille: st.size };
}

module.exports = { nomVerrou, lire, poser, rafraichir, liberer, conflit, estPerime, PEREMPTION_MS, RAFRAICHIR_MS };
