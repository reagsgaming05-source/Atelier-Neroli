/*
 * Lignes du décompte : celles que calcule le serveur, et les retouches faites à la main.
 * Sans rien de la page (pas de DOM) : chargé par app.js, et testé tel quel par
 * tests/test_lignes_js.py.
 *
 * Retoucher une ligne figeait tout : la page cessait de recalculer, et les corrections de pièces
 * suivantes étaient ignorées en silence (le total restait à 60.90 après avoir décoché le musée).
 * Les lignes suivent maintenant toujours le calcul du serveur ; une retouche ne remplace que le
 * champ retouché, et l'on sait si le calcul a changé depuis. Une ligne se reconnaît à sa rubrique
 * et à son calcul : le serveur en fait une par couple.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DgeoLignes = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const cle = (r) => `${r.rubrique}|${r.mode}`;
  const meme = (a, b) => ((typeof a === "number" || typeof b === "number")
    ? (a == null && b == null) || (a != null && b != null && Math.abs(Number(a) - Number(b)) < 0.005)
    : (a ?? "") === (b ?? ""));

  /**
   * Lignes à afficher et à écrire dans l'Excel : le calcul du serveur, retouches appliquées.
   * Chaque ligne porte _cle (sa clé d'origine), _modeAuto et _marques[champ] = { auto, perimee } :
   * perimee = le calcul donne autre chose qu'au moment de la retouche.
   */
  function effectives(autoRows, retouches) {
    return (autoRows || []).map((a) => {
      const k = cle(a);
      const t = (retouches || {})[k] || {};
      const r = Object.assign({}, a, { _cle: k, _modeAuto: a.mode, _marques: {} });
      for (const [champ, x] of Object.entries(t)) {
        r[champ] = x.valeur;
        r._marques[champ] = { auto: a[champ], perimee: !meme(a[champ], x.base) };
      }
      if (t.cout_direct) r.formule = ""; // montant tapé : l'Excel écrit ce nombre, pas le détail des tarifs
      return r;
    });
  }

  /** Retouche d'un champ ; revenir à la valeur calculée efface la retouche. */
  function retoucher(retouches, autoRows, k, champ, valeur) {
    const a = (autoRows || []).find((x) => cle(x) === k);
    if (!a) return;
    const t = retouches[k] || (retouches[k] = {});
    if (meme(valeur, a[champ])) {
      delete t[champ];
      // revenir au calcul d'origine rend inutile le montant tapé pour l'autre calcul
      if (champ === "mode") delete t.cout_direct;
    } else t[champ] = { valeur, base: a[champ] };
    if (!Object.keys(t).length) delete retouches[k];
  }

  /** « ↺ reprendre le calcul » pour un champ. */
  function reprendre(retouches, k, champ) {
    const t = retouches[k];
    if (!t) return;
    delete t[champ];
    if (champ === "mode") delete t.cout_direct;
    if (!Object.keys(t).length) delete retouches[k];
  }

  /** La rubrique d'une ligne a changé : ses retouches la suivent sous sa nouvelle clé. */
  function deplacer(retouches, ancienne, nouvelle) {
    const t = retouches[ancienne];
    if (!t || ancienne === nouvelle) return;
    delete retouches[ancienne];
    retouches[nouvelle] = Object.assign({}, t, retouches[nouvelle] || {});
  }

  /** Retouches dont la ligne n'existe plus (elles reviendront avec elle). */
  const orphelines = (autoRows, retouches) => {
    const cles = new Set((autoRows || []).map(cle));
    return Object.keys(retouches || {}).filter((k) => !cles.has(k));
  };
  const nombre = (retouches) => Object.values(retouches || {}).reduce((s, t) => s + Object.keys(t).length, 0);

  const titres = (eff) => (eff.enseignants_dgeo || 0) + (eff.enseignants_js || 0);
  const personnes = (eff) => (eff.eleves || 0) + titres(eff) + (eff.moniteurs_js || 0) + (eff.autres || 0);
  /** Part de l'État d'une ligne (colonne J), comme l'Excel la calcule. */
  function montant(r, eff) {
    if (r.mode === "direct") return Number(r.cout_direct || 0);
    const total = personnes(eff);
    if (!total || r.cout_total == null) return 0;
    return Number(r.cout_total) / total * titres(eff);
  }
  const arrondi005 = (x) => Math.round(Math.round(x / 0.05) * 0.05 * 100) / 100;
  const total = (rows, eff) => arrondi005((rows || []).reduce((s, r) => s + montant(r, eff), 0));

  return { cle, meme, effectives, retoucher, reprendre, deplacer, orphelines, nombre, titres, personnes, montant, arrondi005, total };
});
