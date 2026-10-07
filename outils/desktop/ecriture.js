/*
 * Réécrire un fichier sur place — « Enregistrer » —, par un fichier temporaire puis un renommage : si l'application s'arrête au milieu, le
 * document d'origine est intact. Le renommage par-dessus un fichier existant est justement ce que Windows refuse quand un autre programme
 * le tient ouvert un instant : l'antivirus qui vient de le regarder, l'indexation, un système de gestion des affaires qui l'a extrait, Acrobat Reader.
 * Dans le premier cas, le verrou se lève en une fraction de seconde : on réessaie quelques fois, à intervalle croissant, avant de renoncer.
 * Dans le second, on dit pourquoi, au lieu d'un code que personne ne sait lire.
 *
 * `fs` et `dormir` se remplacent pour l'essai (test/ecriture.test.js).
 */
const realFs = require('fs');

const CODES_DE_VERROU = ['EPERM', 'EBUSY', 'EACCES'];
const ATTENTES_MS = [150, 300, 600, 1000];   // quatre reprises : une seconde et demie au plus

function dormirSync(ms) { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch (e) { const fin = Date.now() + ms; while (Date.now() < fin) { /* attente active, dernier recours */ } } }

// Rend { reprises } quand le fichier est en place ; lève l'erreur (code AKTUM_VERROUILLE quand c'est un verrou qui ne s'est pas levé).
function remplacer(tmp, cible, o) {
  const fs = (o && o.fs) || realFs, dormir = (o && o.dormir) || dormirSync;
  let reprises = 0;
  for (;;) {
    try { fs.renameSync(tmp, cible); return { reprises }; }
    catch (e) {
      const verrou = e && CODES_DE_VERROU.includes(e.code);
      if (!verrou) throw e;
      if (reprises >= ATTENTES_MS.length) {
        const f = new Error('le fichier est tenu ouvert par un autre programme');
        f.code = 'AKTUM_VERROUILLE'; f.cause = e;
        throw f;
      }
      dormir(ATTENTES_MS[reprises]); reprises++;
    }
  }
}
// L'écriture complète : le temporaire, puis le remplacement ; en cas d'échec le temporaire est retiré.
function ecrireSurPlace(chemin, octets, o) {
  const fs = (o && o.fs) || realFs;
  const tmp = chemin + '.aktum-tmp';
  try {
    fs.writeFileSync(tmp, Buffer.from(octets));
    return remplacer(tmp, chemin, o);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch (e2) { /* jamais écrit, ou déjà parti */ }
    throw e;
  }
}

module.exports = { ecrireSurPlace, remplacer, ATTENTES_MS };
