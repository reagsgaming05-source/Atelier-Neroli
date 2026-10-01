// Le traducteur de l'interface, partagé : la page l'embarque (assembler.js le recolle dans src/01-langue.js),
// et le processus principal d'Electron le charge pour ses menus et ses fenêtres (desktop/langue.js).
// Il ne dépend de rien : un dictionnaire { litteraux, motifs, html, pluriels } en entrée, une fonction en sortie.
// @debut-langue
const LANGUES = { fr: 'Français', de: 'Deutsch' };
const REGIONS = { fr: 'fr-CH', de: 'de-CH' };

// Fabrique la fonction de traduction d'un dictionnaire { litteraux, motifs, html, pluriels }.
//   - un texte connu se traduit tel quel ;
//   - un texte assemblé (« Page 3 sur 12 ») correspond à un motif (« Page {0} sur {1} ») ; ses morceaux
//     variables sont à leur tour traduits (un nom de fichier ne l'est pas, faute d'entrée) ;
//   - le reste est rendu intact : mieux vaut du français qu'un texte inventé.
function fabriquerTraducteur(dico) {
  const exact = new Map();
  ['litteraux', 'html'].forEach(s => Object.keys(dico[s] || {}).forEach(k => { if (dico[s][k] !== k) exact.set(k, dico[s][k]); }));
  const echapper = s => s.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&');
  const motifs = Object.keys(dico.motifs || {}).filter(k => dico.motifs[k] !== k).map(k => {
    const morceaux = k.split(/\{(\d+)\}/);
    let re = '^';
    const ordre = [];
    let fixe = 0;
    morceaux.forEach((m, i) => {
      if (i % 2 === 0) { re += echapper(m); fixe += m.length; } else { re += '([\\s\\S]*?)'; ordre.push(+m); }
    });
    return { re: new RegExp(re + '$'), ordre, gabarit: dico.motifs[k], fixe };
  }).sort((a, b) => b.fixe - a.fixe);
  const pluriels = dico.pluriels || {};
  // Une fin de phrase suivie d'une majuscule : « … sur 6 pages. Toutes portent du texte … ».
  const FIN_DE_PHRASE = /[.!?]\s+[A-ZÀ-ÖØ-Þ]/;

  // Dernier recours : un texte assemblé hors de tout motif (« rapport.pdf · modifié ») contient des textes
  // connus, que l'on remplace là où ils se trouvent, en mots entiers, le plus long d'abord.
  let glossaire = null;
  const estLettre = c => !!c && /[\p{L}\p{N}]/u.test(c);
  function parGlossaire(s) {
    if (!glossaire) {
      const cles = Array.from(exact.keys()).filter(k => k.length >= 4).sort((a, b) => b.length - a.length);
      glossaire = cles.length ? new RegExp(cles.map(echapper).join('|'), 'g') : false;
    }
    if (!glossaire) return s;
    return s.replace(glossaire, (m, i) => {
      const avant = s[i - 1], apres = s[i + m.length];
      if ((estLettre(m[0]) && estLettre(avant)) || (estLettre(m[m.length - 1]) && estLettre(apres))) return m;
      return exact.get(m);
    });
  }

  function traduire(s, profondeur, sansGlossaire) {
    if (typeof s !== 'string' || s === '') return s;
    if (exact.has(s)) return exact.get(s);
    if (!profondeur) profondeur = 0;
    let avale = false;
    for (const m of motifs) {
      const r = m.re.exec(s);
      if (!r) continue;
      // Le morceau variable d'un motif ne s'étend pas sur une phrase suivante : « Aucune page vide sur {0}. » avalait « 6 pages. Toutes
      // portent du texte. » en entier, et la seconde phrase restait en français. Le texte est alors traduit phrase par phrase, plus bas.
      if (r.slice(1).some(a => FIN_DE_PHRASE.test(a))) { avale = true; continue; }
      const args = [];
      for (let i = 0; i < m.ordre.length; i++) if (args[m.ordre[i]] === undefined) args[m.ordre[i]] = r[i + 1];
      return m.gabarit.replace(/\{(\d+)\}/g, (_, n) => {
        const v = args[+n];
        return v === undefined ? '' : (profondeur < 3 ? traduire(v, profondeur + 1) : v);
      });
    }
    // Plusieurs phrases collées dont un motif aurait avalé la seconde : chacune se traduit à part (avec ses propres motifs), puis elles se rejoignent.
    if (avale && profondeur < 3) {
      const phrases = s.split(/(?<=[.!?])(?=\s+[A-ZÀ-ÖØ-Þ])/);
      if (phrases.length > 1) {
        const sortie = phrases.map(p => traduire(p, profondeur + 1)).join('');
        if (sortie !== s) return sortie;
      }
    }
    // Espaces de bord et retours à la ligne du HTML : le texte est cherché sans eux, puis rhabillé.
    const bords = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
    if (bords[1] || bords[3] || /\s{2,}|\n/.test(bords[2])) {
      const nu = bords[2].replace(/\s+/g, ' ');
      // (sans le glossaire : il garde les retours à la ligne là où le texte les met)
      if (nu && (nu !== s)) { const t = traduire(nu, profondeur, true); if (t !== nu) return bords[1] + t + bords[3]; }
    }
    return sansGlossaire ? s : parGlossaire(s);
  }
  // « 3 pages » : le nombre, puis le nom au singulier ou au pluriel — l'allemand compte « 0 Seiten » (pluriel), le français « 0 page ».
  traduire.pluriel = (n, un, plusieurs, lang) => {
    const pl = lang === 'de' ? n !== 1 : n > 1;
    if (lang === 'de' && pl && un === plusieurs && pluriels[un] !== undefined) return pluriels[un];
    return traduire(pl ? plusieurs : un);
  };
  return traduire;
}
// @fin-langue

if (typeof module !== 'undefined' && module.exports) module.exports = { fabriquerTraducteur, LANGUES, REGIONS };
