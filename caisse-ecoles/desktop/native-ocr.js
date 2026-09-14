/*
 * Troisième lecteur : Tesseract natif (programme tesseract.exe fourni dans le dossier portable,
 * comme pour Décompte DGEO), piloté depuis le processus principal d'Electron. Le renderer lui
 * envoie l'image d'une zone (PNG) et reçoit les mots lus avec leur position et leur confiance.
 *
 * Recherche du programme : dossier tesseract/ à côté de l'exécutable (version portable),
 * variable TESSERACT_CMD, puis « tesseract » dans le PATH (développement sous Linux/macOS).
 * Les modèles de langue sont dans tesseract/tessdata/ (fra de tessdata_best, flottant, le plus
 * précis, plus le modèle combiné pour le moteur historique sur les chiffres).
 */
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

let resolved = null; // { cmd, tessdata, version, langs, legacy }

function candidates(portableDir) {
  const exe = process.platform === 'win32' ? 'tesseract.exe' : 'tesseract';
  const list = [];
  if (portableDir) list.push({ cmd: path.join(portableDir, 'tesseract', exe), tessdata: path.join(portableDir, 'tesseract', 'tessdata') });
  if (process.env.TESSERACT_CMD) list.push({ cmd: process.env.TESSERACT_CMD, tessdata: process.env.TESSDATA_PREFIX || null });
  list.push({ cmd: exe, tessdata: process.env.TESSDATA_PREFIX || null });
  return list;
}

/** Détecte le programme et ses langues ; renvoie null s'il n'est pas utilisable. */
function detect(portableDir) {
  if (resolved !== null) return resolved || null;
  for (const c of candidates(portableDir)) {
    try {
      if (c.cmd.includes(path.sep) && !fs.existsSync(c.cmd)) continue;
      const v = spawnSync(c.cmd, ['--version'], { encoding: 'utf8', timeout: 10000 });
      if (v.status !== 0) continue;
      const version = (v.stdout || v.stderr || '').split('\n')[0].trim();
      const args = ['--list-langs'];
      if (c.tessdata) args.push('--tessdata-dir', c.tessdata);
      const l = spawnSync(c.cmd, args, { encoding: 'utf8', timeout: 10000 });
      const langs = (l.stdout || '').split('\n').map((s) => s.trim()).filter((s) => /^[a-z_]+$/.test(s));
      if (!langs.includes('fra')) continue;
      // moteur historique disponible ? (modèle combiné) : essai à blanc
      const legacy = langs.includes('fra_leg') && hasLegacy(c);
      resolved = { cmd: c.cmd, tessdata: c.tessdata, version, langs, legacy };
      return resolved;
    } catch (e) {
      /* candidat suivant */
    }
  }
  resolved = false;
  return null;
}

function hasLegacy(c) {
  // le moteur historique exige un modèle « fra » combiné ; avec un modèle LSTM seul,
  // Tesseract refuse (« components are not present ») et sort en erreur
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAGAAAAAoCAAAAAAk+KDlAAAAK0lEQVR4nO3NMQEAAAjDMMC/ZzDBvlRA01vZJvwHAAAAAAAAAAAAAADgsQOGQAFP+paEDwAAAABJRU5ErkJggg==', 'base64');
  // le modèle combiné est fourni sous le nom « fra_leg » (le modèle « fra » est le LSTM flottant seul)
  const r = spawnSync(c.cmd, tessArgs(c, { psm: 7, oem: 0, lang: 'fra_leg' }), { input: png, encoding: 'utf8', timeout: 20000, env: tessEnv() });
  return r.status === 0 && !/not present|Error|Failed loading/i.test(r.stderr || '');
}

function tessEnv() {
  // un seul fil par processus : plus rapide sur de petites images, et plusieurs zones
  // peuvent être lues en parallèle
  return Object.assign({}, process.env, { OMP_THREAD_LIMIT: '1' });
}

/** Arguments communs : lecture sur l'entrée standard, sortie TSV (mots, positions, confiances). */
function tessArgs(c, opts) {
  const args = ['stdin', 'stdout', '--psm', String(opts.psm || 6), '--oem', String(opts.oem == null ? 1 : opts.oem), '-l', opts.lang || 'fra',
    '-c', 'preserve_interword_spaces=1', '-c', 'tessedit_create_tsv=1', '-c', 'tessedit_create_txt=0'];
  if (opts.dpi) args.push('--dpi', String(opts.dpi));
  if (c.tessdata) args.push('--tessdata-dir', c.tessdata);
  return args;
}

/** Mots du format TSV de Tesseract (niveau 5), positions en pixels de l'image envoyée. */
function parseTsv(tsv) {
  const out = [];
  for (const line of String(tsv || '').split('\n').slice(1)) {
    const c = line.split('\t');
    if (c.length < 12 || c[0] !== '5') continue;
    const text = c[11].trim();
    if (!text) continue;
    out.push({ text, conf: Math.round(Number(c[10])), x0: Number(c[6]), y0: Number(c[7]), x1: Number(c[6]) + Number(c[8]), y1: Number(c[7]) + Number(c[9]) });
  }
  return out;
}

let running = 0;
const queue = [];
const MAX_PARALLEL = Math.max(1, Math.min(3, require('os').cpus().length - 1));

function next() {
  if (running >= MAX_PARALLEL || !queue.length) return;
  const job = queue.shift();
  running++;
  job().finally(() => { running--; next(); });
}

/**
 * Reconnaît une image PNG. opts : { psm (7 ligne, 6 bloc, 11 épars), oem (1 LSTM, 0 historique),
 * dpi }. Renvoie une promesse de mots { text, conf, x0, y0, x1, y1 }.
 */
function recognize(png, opts, portableDir) {
  const t = detect(portableDir);
  if (!t) return Promise.reject(new Error('Tesseract natif non disponible'));
  opts = opts || {};
  return new Promise((resolve, reject) => {
    queue.push(() => new Promise((done) => {
      const p = spawn(t.cmd, tessArgs(t, opts), { windowsHide: true, env: tessEnv() });
      const out = []; const err = [];
      p.stdout.on('data', (d) => out.push(d));
      p.stderr.on('data', (d) => err.push(d));
      p.on('error', (e) => { reject(e); done(); });
      p.on('close', (code) => {
        if (code !== 0) reject(new Error(`tesseract : code ${code} ${Buffer.concat(err).toString('utf8').slice(0, 200)}`));
        else resolve(parseTsv(Buffer.concat(out).toString('utf8')));
        done();
      });
      p.stdin.on('error', () => {});
      p.stdin.end(Buffer.from(png));
    }));
    next();
  });
}

module.exports = { detect, recognize, parseTsv };
