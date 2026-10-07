/*
 * Vérifier une archive de mise à jour avant de la déballer — pour le script de
 * mise à jour, qui tourne après la fermeture de l'application et ne sait pas
 * faire de cryptographie. Il appelle l'application elle-même, qui porte les
 * clés publiques de l'éditeur, dans un mode qui ne montre aucune fenêtre :
 *
 *   AktumPDF.exe --verifier-maj <archive.zip> <fichier-de-résultat>
 *
 * (Avant, c'était le moteur lancé « en Node » — ELECTRON_RUN_AS_NODE —, ce qui fait de l'exécutable un interpréteur
 * JavaScript pour quiconque peut le lancer : le fusible correspondant est maintenant fermé, voir package.json › electronFuses.)
 *
 * Code de sortie : 0 = signée par l'éditeur ; 2 = refusée (la raison est écrite). Le résultat tient en une ligne, dans le fichier
 * donné : un exécutable à fenêtres n'a pas de sortie standard lisible par un script Windows.
 */
const fs = require('fs');

function verifierPourLeScript(zip, sortie) {
  const { verifierZip, lireCles } = require('./signature');
  let code = 2, ligne = '';
  if (!zip) ligne = 'SIGNATURE-REFUSEE : aucune archive donnée';
  else {
    try {
      const r = verifierZip(zip, { cles: lireCles().maj });
      if (r.ok) { code = 0; ligne = 'SIGNATURE-OK ' + (r.piece.version || '') + ' ' + (r.piece.canal || ''); }
      else ligne = 'SIGNATURE-REFUSEE : ' + r.raison;
    } catch (e) { ligne = 'SIGNATURE-REFUSEE : ' + (e && e.message ? e.message : e); }
  }
  if (sortie) { try { fs.writeFileSync(sortie, ligne + '\n', 'utf8'); } catch (e) { /* le code de sortie dit déjà l'essentiel */ } }
  return { code, ligne };
}
module.exports = { verifierPourLeScript };

// En ligne de commande (pour un essai) : node verifier-maj.js <archive.zip>
if (require.main === module) {
  const r = verifierPourLeScript(process.argv[2], process.argv[3]);
  (r.code === 0 ? console.log : console.error)(r.ligne);
  process.exit(r.code);
}
