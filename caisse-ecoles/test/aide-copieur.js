/*
 * Un faux copieur, pour éprouver la veille du dossier scanné.
 *
 * Le vrai copieur n'écrit pas son fichier d'un coup : il l'allonge par morceaux, et pendant
 * quelques secondes ce qui est sur le disque est un PDF tronqué qu'on lirait de travers. Ces
 * aides fabriquent de vrais PDF (pdf-lib, celui de l'application) et les posent comme le
 * copieur le fait — par tranches, avec des pauses.
 *
 * Aucune donnée réelle : des pages blanches avec un mot, et des noms fictifs.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PDFDocument, StandardFonts } = require('pdf-lib');

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Un PDF véritable de `pages` pages, chacune portant son texte. */
async function pdfExemple(textes) {
  const lignes = Array.isArray(textes) ? textes : [String(textes == null ? 'page' : textes)];
  const doc = await PDFDocument.create();
  const police = await doc.embedFont(StandardFonts.Helvetica);
  for (const t of lignes) {
    const p = doc.addPage([595, 842]);
    p.drawText(String(t), { x: 60, y: 760, size: 14, font: police });
  }
  return Buffer.from(await doc.save());
}

/**
 * Pose un fichier comme le copieur : par tranches, avec une pause entre chacune. Rend une
 * promesse résolue quand la dernière tranche est écrite. Tant qu'elle n'est pas résolue, ce qui
 * est sur le disque est un PDF incomplet.
 */
async function ecrireLentement(chemin, octets, opts) {
  opts = opts || {};
  const tranches = Math.max(2, opts.tranches || 4);
  const pauseMs = opts.pauseMs == null ? 40 : opts.pauseMs;
  const taille = Math.ceil(octets.length / tranches);
  const fd = fs.openSync(chemin, 'w');
  try {
    for (let i = 0; i < octets.length; i += taille) {
      fs.writeSync(fd, octets.subarray(i, Math.min(i + taille, octets.length)));
      if (i + taille < octets.length) await pause(pauseMs);
    }
  } finally {
    fs.closeSync(fd);
  }
  return chemin;
}

/** Le même fichier, coupé net : ce que le copieur laisse s'il est débranché en plein envoi. */
function ecrireTronque(chemin, octets, fraction) {
  const n = Math.max(1, Math.floor(octets.length * (fraction == null ? 0.3 : fraction)));
  fs.writeFileSync(chemin, octets.subarray(0, n));
  return chemin;
}

/** Un dossier de travail à jeter après le test. */
function dossierTemporaire(nom) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `caisse-${nom || 'veille'}-`));
  return {
    chemin: d,
    fichier: (n) => path.join(d, n),
    liste: (sous) => {
      const p = sous ? path.join(d, sous) : d;
      try { return fs.readdirSync(p).sort(); } catch (e) { return []; }
    },
    /** Tous les fichiers du dossier et de ses sous-dossiers, chemins relatifs. */
    tout: () => {
      const out = [];
      const parcourir = (p, prefixe) => {
        for (const e of fs.readdirSync(p, { withFileTypes: true })) {
          const rel = prefixe ? `${prefixe}/${e.name}` : e.name;
          if (e.isDirectory()) parcourir(path.join(p, e.name), rel);
          else out.push(rel);
        }
      };
      try { parcourir(d, ''); } catch (e) { /* dossier disparu */ }
      return out.sort();
    },
    jeter: () => { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) { /* ignore */ } },
  };
}

/** Une horloge que le test fait avancer lui-même : les délais d'attente ne coûtent rien. */
function horlogeFactice(depart) {
  let t = depart == null ? 1700000000000 : depart;
  return { maintenant: () => t, avancer: (ms) => { t += ms; return t; } };
}

module.exports = { pdfExemple, ecrireLentement, ecrireTronque, dossierTemporaire, horlogeFactice, pause };
