/*
 * Lecture croisée : seconde lecture des pièces par un OCR local (Tesseract, moteur libre
 * exécuté dans le navigateur, sans réseau), confrontée à la couche texte du PDF.
 *
 *  - partie « pure » (utilisable dans Node pour les tests et les mesures) : prétraitement
 *    de l'image, découpage en zones, interprétation des lectures, confrontation des deux
 *    lectures champ par champ ;
 *  - partie navigateur (en bas) : moteur Tesseract embarqué, rendu des pages, pilotage.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./parser.js'));
  else root.CaisseOCR = factory(root.CaisseParser);
})(typeof self !== 'undefined' ? self : this, function (P) {
  'use strict';

  const SCALE = 3; // rendu des pages à 3 × 72 dpi ≈ 216 dpi, suffisant pour du texte imprimé
  const PAD = 8; // marge (points PDF) autour des zones

  /* ------------------------------------------------------------------ */
  /* Prétraitement de l'image                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Niveaux de gris, seuillage, puis effacement des traits du formulaire (lignes
   * horizontales et verticales longues) qui perturbent l'OCR. img : { width, height, data }
   * (RGBA). Renvoie une image de même forme, noir sur blanc.
   */
  function preprocess(img, opts) {
    opts = opts || {};
    const W = img.width;
    const H = img.height;
    const data = img.data;
    const minRun = opts.minRun || Math.round(Math.min(W, H) * 0.06);
    const thr = opts.threshold || 160;
    const ink = new Uint8Array(W * H);
    for (let i = 0, p = 0; i < W * H; i++, p += 4) {
      const g = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
      ink[i] = g < thr ? 1 : 0;
    }
    const erase = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      let run = 0;
      for (let x = 0; x <= W; x++) {
        const v = x < W ? ink[y * W + x] : 0;
        if (v) run++;
        else {
          if (run >= minRun) for (let k = x - run; k < x; k++) erase[y * W + k] = 1;
          run = 0;
        }
      }
    }
    for (let x = 0; x < W; x++) {
      let run = 0;
      for (let y = 0; y <= H; y++) {
        const v = y < H ? ink[y * W + x] : 0;
        if (v) run++;
        else {
          if (run >= minRun) for (let k = y - run; k < y; k++) erase[k * W + x] = 1;
          run = 0;
        }
      }
    }
    const out = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        let e = erase[i];
        if (!e) e = (x > 0 && erase[i - 1]) || (x < W - 1 && erase[i + 1]) || (y > 0 && erase[i - W]) || (y < H - 1 && erase[i + W]);
        const v = e || !ink[i] ? 255 : 0;
        out[i * 4] = v; out[i * 4 + 1] = v; out[i * 4 + 2] = v; out[i * 4 + 3] = 255;
      }
    }
    return { width: W, height: H, data: out };
  }

  /* ------------------------------------------------------------------ */
  /* Zones à relire                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Zones de la pièce à soumettre à la seconde lecture, en points PDF : [x, y, w, h].
   * Les cellules du tableau viennent de la géométrie du formulaire (layout) ; quand la
   * couche texte a situé le champ, sa boîte (élargie) est préférée pour n°, total et date.
   * psm : mode de segmentation Tesseract (7 = une ligne, 6 = bloc, 11 = texte épars).
   */
  function zonesFor(info) {
    const L = info.layout;
    const B = info.boxes || {};
    const tight = (b, px, py) => (b ? [b.x - px, b.y - py, b.w + 2 * px, b.h + 2 * py] : null);
    const bandY = L.yHeader + 4;
    const bandH = Math.max(24, L.yLibelle - 34 - L.yHeader);
    const left = 40;
    const right = L.width - 40;
    // pre : image prétraitée (traits effacés) ou image brute. Mesuré sur 106 pièces : les
    // champs numériques se lisent mieux sur l'image brute (le seuillage abîme les « 1 »),
    // le libellé mieux sans les lignes du tableau.
    return [
      { name: 'no', rect: tight(B.no, 10, 8) || [L.b1, L.yHeader - 50, L.b2 - L.b1, 36], psm: 7, pre: false },
      { name: 'doit', rect: [left, bandY, L.b1 - left, bandH], psm: 11, pre: false },
      { name: 'somme', rect: [L.b1, bandY, L.b2 - L.b1, bandH], psm: 11, pre: false },
      { name: 'avoir', rect: [L.b2, bandY, right - L.b2, bandH], psm: 11, pre: false },
      { name: 'total', rect: tight(B.total, 12, 8) || [L.b1, L.yTotal - 16, L.b2 - L.b1, 24], psm: 7, pre: false },
      { name: 'date', rect: tight(B.date, 12, 8) || [left, L.yTotal + 8, L.b1 - left, 34], psm: 7, pre: false },
      { name: 'libelle', rect: [left, L.yLibelle + 4, L.b1 - left, Math.max(24, L.yTotal - 12 - L.yLibelle)], psm: 6, pre: true },
    ];
  }

  /** Rectangle de zone (points) -> pixels de l'image rendue à SCALE, borné à l'image. */
  function zonePixels(rect, imgW, imgH, scale) {
    scale = scale || SCALE;
    const x = Math.max(0, Math.round(rect[0] * scale));
    const y = Math.max(0, Math.round(rect[1] * scale));
    const w = Math.min(imgW - x, Math.round(rect[2] * scale));
    const h = Math.min(imgH - y, Math.round(rect[3] * scale));
    return w > 4 && h > 4 ? { x, y, w, h } : null;
  }

  /**
   * Mots renvoyés par Tesseract (blocs -> paragraphes -> lignes -> mots, boîtes en pixels
   * du découpage) -> mots en points PDF sur la page : { str, conf, x, y, w, h }.
   * dx, dy : position (pixels) du coin du découpage dans l'image de la page, marge déduite.
   */
  function itemsFromBlocks(blocks, scale, dx, dy) {
    scale = scale || SCALE;
    const out = [];
    for (const b of blocks || []) {
      for (const p of b.paragraphs || []) {
        for (const l of p.lines || []) {
          for (const w of l.words || []) {
            const s = String(w.text || '').trim();
            if (!s || !w.bbox) continue;
            out.push({
              str: s,
              conf: Math.round(w.confidence || 0),
              x: (w.bbox.x0 + (dx || 0)) / scale,
              y: (w.bbox.y1 + (dy || 0)) / scale,
              w: (w.bbox.x1 - w.bbox.x0) / scale,
              h: (w.bbox.y1 - w.bbox.y0) / scale,
            });
          }
        }
      }
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Interprétation des lectures                                            */
  /* ------------------------------------------------------------------ */

  const JUNK_EDGE = /^[|_\u2014\u2013\u2018\u2019\u201C\u201D\u00AB\u00BB;:]+|[|_\u2014\u2013\u2018\u2019\u201C\u201D\u00AB\u00BB]+$/g;
  const NO_ALNUM = /^[^A-Za-z0-9\u00C0-\u017F]+$/;
  const PUNCT_OK = /^[-+&\/]$/; // ponctuation isolée légitime dans un libellé (« 7 - 11S », « + »)

  /** Retire les résidus de traits (« | », « _ », « — ») et les jetons sans lettre ni chiffre. */
  function cleanWords(words) {
    const out = [];
    for (const w of words || []) {
      const str = String(w.str || '').replace(JUNK_EDGE, '').trim();
      if (!str || (NO_ALNUM.test(str) && !PUNCT_OK.test(str))) continue;
      out.push(Object.assign({}, w, { str }));
    }
    return out;
  }

  function uniq(arr) {
    const seen = new Set();
    return arr.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
  }

  function readNo(words) {
    const cands = cleanWords(words).map((w) => Object.assign({}, w, { str: w.str.replace(/[OoQ]/g, '0').replace(/[Il|]/g, '1').replace(/[^0-9]/g, '') }))
      .filter((w) => /^\d{1,4}$/.test(w.str));
    if (!cands.length) return null;
    const best = cands.reduce((a, b) => (b.conf > a.conf ? b : a));
    return { value: parseInt(best.str, 10), conf: best.conf, raw: best.str };
  }

  function readAmounts(words) {
    const out = [];
    for (const l of P.groupLines(cleanWords(words))) {
      const v = P.normalizeAmount(l.text);
      if (v == null || v <= 0) continue;
      const nums = l.words.filter((w) => /\d/.test(w.str));
      const conf = nums.length ? Math.min.apply(null, nums.map((w) => w.conf)) : 0;
      out.push({ value: v, conf, raw: l.text });
    }
    return out;
  }

  function readAccounts(words) {
    const out = [];
    for (const w of cleanWords(words)) {
      const a = P.normalizeAccount(w.str);
      if (a) out.push({ value: a, conf: w.conf, raw: w.str });
    }
    return out;
  }

  function readDate(words) {
    for (const l of P.groupLines(cleanWords(words))) {
      const d = P.findDate(l.text);
      if (d) return { value: d, conf: Math.min.apply(null, l.words.map((w) => w.conf)), raw: l.text };
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Libellé : remplacement des jetons douteux                              */
  /* ------------------------------------------------------------------ */

  // Caractères qui n'apparaissent jamais dans un libellé correctement lu
  const GARBAGE_CHARS = /[\^£<>*~$#{}\[\]\\|¦§¤©®°µ¬¢]/;
  const LETTER = /[A-Za-z\u00C0-\u017F]/;

  /** Jeton de la couche texte probablement mal lu. */
  function suspiciousToken(tok, index) {
    if (GARBAGE_CHARS.test(tok)) return true;
    if (!/[A-Za-z0-9\u00C0-\u017F]/.test(tok)) return !PUNCT_OK.test(tok);
    // mot inconnu du vocabulaire qui ressemble à une erreur de lecture (parser.unknownWords :
    // ignore les dates, classes, sigles et mots courts)
    if (index && LETTER.test(tok) && P.unknownWords(tok, index).length) return true;
    return false;
  }

  /** Jeton OCR utilisable comme remplacement : propre et sûr. */
  function cleanToken(tok, conf, index) {
    if (conf < 70) return false;
    if (GARBAGE_CHARS.test(tok)) return false;
    if (!/[A-Za-z0-9\u00C0-\u017F]/.test(tok)) return PUNCT_OK.test(tok);
    if (index && LETTER.test(tok) && P.unknownWords(tok, index).length) return false;
    return true;
  }

  /** Découpe un élément de la couche texte (parfois plusieurs mots) en jetons positionnés. */
  function tokensOf(item) {
    const parts = String(item.str || '').split(/\s+/).filter(Boolean);
    const total = parts.reduce((a, p) => a + p.length, 0) + Math.max(0, parts.length - 1);
    const width = item.w && item.w > 0 ? item.w : total * (item.h || 10) * 0.5;
    const out = [];
    let pos = 0;
    for (const p of parts) {
      const x0 = item.x + (pos / total) * width;
      const x1 = item.x + ((pos + p.length) / total) * width;
      out.push({ str: p, x: x0, w: x1 - x0, y: item.y, h: item.h || 10 });
      pos += p.length + 1;
    }
    return out;
  }

  function overlapX(a, b) {
    const x0 = Math.max(a.x, b.x);
    const x1 = Math.min(a.x + a.w, b.x + b.w);
    return Math.max(0, x1 - x0);
  }

  function sameLine(a, b) {
    const ha = a.h && a.h > 2 ? a.h : 10;
    const hb = b.h && b.h > 2 ? b.h : 10;
    return Math.abs(a.y - b.y) <= Math.max(ha, hb) * 0.7;
  }

  /**
   * Libellé de la couche texte (mots positionnés) corrigé par les mots de l'OCR local :
   * chaque jeton douteux est remplacé par le ou les mots OCR qui occupent la même place.
   * Renvoie { lines, replacements: [{ from, to }] }.
   */
  function mergeLibelle(aWords, bWords, index) {
    const b = cleanWords(bWords);
    const used = new Set();
    const replacements = [];
    const lines = [];
    for (const line of P.groupLines(aWords)) {
      const toks = [];
      for (const item of line.words) toks.push.apply(toks, tokensOf(item));
      // la ligne du nom est traitée à part (initiales, noms connus) : on n'y touche pas
      if (P.looksLikePerson(line.text)) { lines.push(line.text.replace(/\s+/g, ' ').trim()); continue; }
      const outToks = [];
      for (const t of toks) {
        if (!suspiciousToken(t.str, index)) {
          // jeton déjà couvert par un mot OCR retenu pour un jeton voisin (« 0^. » + « 05.25 »
          // remplacés ensemble par « 02.05.25 ») : on ne le répète pas
          const covered = Array.from(used).some((w) => sameLine(w, t) && overlapX(w, t) > t.w * 0.5);
          if (!covered) outToks.push(t.str);
          continue;
        }
        const near = b.filter((w) => !used.has(w) && sameLine(w, t) && overlapX(w, t) > Math.min(w.w, t.w) * 0.3)
          .sort((p, q) => p.x - q.x);
        if (near.length && near.every((w) => cleanToken(w.str, w.conf, index))) {
          near.forEach((w) => used.add(w));
          const to = near.map((w) => w.str).join(' ');
          replacements.push({ from: t.str, to });
          outToks.push(to);
        } else {
          outToks.push(t.str);
        }
      }
      const text = outToks.join(' ').replace(/\s+/g, ' ').trim();
      if (text) lines.push(text);
    }
    return { lines, replacements };
  }

  const normText = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[^a-z0-9À-ſ]+/g, '');

  /* ------------------------------------------------------------------ */
  /* Confrontation des deux lectures                                        */
  /* ------------------------------------------------------------------ */

  /**
   * info  : résultat d'analyzePage sur la couche texte (peut être partiel).
   * reads : mots OCR par zone { no, doit, somme, avoir, total, date, libelle } (points PDF).
   * ctx   : { index } (base de référence : comptes et vocabulaire connus).
   * Renvoie une copie de info complétée/corrigée, avec crossFlags (constats par champ) et
   * crossChecked = true.
   */
  function crossRead(info, reads, ctx) {
    ctx = ctx || {};
    const index = ctx.index || null;
    const known = new Set(index && index.accounts ? Array.from(index.accounts) : []);
    if (ctx.caisse) known.add(ctx.caisse);
    known.add(P.DEFAULT_CAISSE);
    // Page sans couche texte (info issue d'une première passe OCR) : les relectures par zone,
    // plus précises, priment sur la première passe.
    const primaryB = info.source === 'ocr';
    const out = Object.assign({}, info, { crossFlags: [], crossChecked: true });
    const flags = out.crossFlags;
    const ok = (field, message) => flags.push({ field, level: 'ok', message });
    const note = (field, message) => flags.push({ field, level: 'note', message });
    const doubt = (field, message, action) => flags.push({ field, level: 'doubt', message, action });
    const set = (field, value) => ({ type: 'set', field, value });
    const fmt = (v) => Number(v).toFixed(2);

    const B = {
      no: reads.no ? readNo(reads.no) : null,
      total: reads.total ? (readAmounts(reads.total)[0] || null) : null,
      sommes: reads.somme ? readAmounts(reads.somme) : [],
      doit: reads.doit ? readAccounts(reads.doit) : [],
      avoir: reads.avoir ? readAccounts(reads.avoir) : [],
      date: reads.date ? readDate(reads.date) : null,
      libelle: reads.libelle || [],
    };

    // ---- Numéro
    if (B.no) {
      if (primaryB && info.no !== B.no.value && B.no.conf >= 60) { out.no = B.no.value; out.noRaw = String(B.no.value); }
      if (info.no == null || (primaryB && out.no === B.no.value && info.no !== B.no.value)) {
        out.no = B.no.value; out.noRaw = String(B.no.value);
        note('no', `N° ${B.no.value} lu par la seconde lecture (OCR local)`);
      } else if (info.no === B.no.value) {
        ok('no', 'N° confirmé par la seconde lecture');
      } else if (B.no.conf >= 85 && info.noRaw && /[^0-9\s]/.test(String(info.noRaw))) {
        note('no', `N° ${B.no.value} retenu d'après la seconde lecture (couche texte : « ${String(info.noRaw).trim()} »)`);
        out.no = B.no.value; out.noRaw = String(B.no.value);
      } else if (B.no.conf >= 80) {
        doubt('no', `Deux lectures différentes du n° : ${info.no} (couche texte) et ${B.no.value} (OCR local) : à vérifier`, set('no', B.no.value));
      }
    }

    // ---- Montant : le Total fait foi, les SOMME confirment
    const bAmount = B.total || (B.sommes.length === 1 ? B.sommes[0] : null);
    const bValues = uniq([B.total].concat(B.sommes).filter(Boolean).map((a) => a.value));
    const aSommes = (info.sommes || []).map((s) => s.value).filter((v) => v != null);
    if (primaryB && bAmount && bAmount.conf >= 60 && info.total !== bAmount.value) {
      out.total = bAmount.value; out.totalRaw = bAmount.raw;
      if (B.sommes.length) out.sommes = B.sommes.map((a) => ({ value: a.value, raw: a.raw }));
      note('montant', `Total ${fmt(bAmount.value)} lu par relecture ciblée (OCR local)`);
    } else if (info.total != null) {
      if (bValues.includes(info.total)) ok('montant', 'Montant confirmé par la seconde lecture');
      else if (bAmount && bAmount.conf >= 50) doubt('montant', `Deux lectures différentes du montant : ${fmt(info.total)} (couche texte) et ${fmt(bAmount.value)} (OCR local) : à vérifier`, set('montant', bAmount.value));
    } else if (bAmount) {
      const lenient = info.totalLenient != null ? info.totalLenient : null;
      if (aSommes.includes(bAmount.value) || lenient === bAmount.value) {
        out.total = bAmount.value; out.totalRaw = bAmount.raw;
        ok('montant', `Montant ${fmt(bAmount.value)} confirmé par la seconde lecture`);
      } else if (!aSommes.length && bAmount.conf >= 60) {
        out.total = bAmount.value; out.totalRaw = bAmount.raw;
        note('montant', `Total ${fmt(bAmount.value)} lu par la seconde lecture (OCR local) : illisible dans la couche texte`);
      } else {
        doubt('montant', `Total ${fmt(bAmount.value)} lu par l'OCR local${aSommes.length ? `, différent de la somme ${aSommes.map(fmt).join(', ')} de la couche texte` : ' (lecture peu sûre)'} : à vérifier`, set('montant', bAmount.value));
      }
    } else if (info.total == null && !aSommes.length && B.sommes.length > 1) {
      doubt('montant', `Plusieurs sommes lues par l'OCR local (${B.sommes.map((s) => fmt(s.value)).join(', ')}) et aucun total : à vérifier`);
    }

    // ---- Comptes
    const aAcc = uniq((info.doit || []).concat(info.avoir || []));
    const bDoit = uniq(B.doit.map((a) => a.value));
    const bAvoir = uniq(B.avoir.map((a) => a.value));
    const bAcc = uniq(bDoit.concat(bAvoir));
    if ((!aAcc.length || primaryB) && bAcc.length) {
      if (aAcc.length !== bAcc.length || aAcc.some((a) => !bAcc.includes(a))) {
        out.doit = bDoit; out.avoir = bAvoir;
        note('compte', `Comptes lus par la seconde lecture (OCR local) : ${bAcc.join(', ')}`);
      } else ok('compte', 'Comptes confirmés par la seconde lecture');
    } else if (aAcc.length && bAcc.length) {
      const onlyA = aAcc.filter((a) => !bAcc.includes(a));
      const onlyB = bAcc.filter((a) => !aAcc.includes(a));
      if (!onlyA.length && !onlyB.length) ok('compte', 'Comptes confirmés par la seconde lecture');
      else if (onlyA.length && onlyB.length) {
        // Divergence : on ne s'inquiète que si la lecture OCR est un compte connu, ou si
        // celle de la couche texte ne l'est pas (les erreurs OCR donnent des comptes inconnus).
        const bKnown = onlyB.filter((a) => known.has(a));
        const aUnknown = onlyA.filter((a) => !known.has(a));
        if (bKnown.length || aUnknown.length) {
          doubt('compte', `Deux lectures différentes du compte : ${onlyA.join(', ')} (couche texte) et ${onlyB.join(', ')} (OCR local) : à vérifier`, set('compte', (bKnown[0] || onlyB[0])));
        }
      } else if (onlyB.length && onlyB.some((a) => known.has(a))) {
        doubt('compte', `Compte supplémentaire lu par l'OCR local : ${onlyB.join(', ')} : à vérifier`);
      }
    }

    // ---- Date
    if (B.date) {
      if (!info.date || (primaryB && info.date !== B.date.value && B.date.conf >= 60)) {
        out.date = B.date.value; out.dateRaw = B.date.raw;
        note('date', `Date ${P.isoToDisplay(B.date.value)} lue par la seconde lecture (OCR local)`);
      } else if (info.date === B.date.value) {
        ok('date', 'Date confirmée par la seconde lecture');
      } else {
        doubt('date', `Deux lectures différentes de la date : ${P.isoToDisplay(info.date)} (couche texte) et ${P.isoToDisplay(B.date.value)} (OCR local) : à vérifier`, set('date', B.date.value));
      }
    }

    // ---- Libellé
    if (B.libelle.length) {
      const bLines = P.groupLines(cleanWords(B.libelle)).map((l) => l.text).filter((t) => /[A-Za-z0-9]/.test(t));
      if (!(info.libelleLines || []).length || primaryB) {
        if (bLines.length) out.libelleLines = bLines;
        if (!(info.libelleLines || []).length) note('libelle', 'Libellé lu par la seconde lecture (OCR local)');
      } else if (info.libelleWords && info.libelleWords.length) {
        const m = mergeLibelle(info.libelleWords, B.libelle, index);
        if (m.replacements.length) {
          out.libelleLines = m.lines;
          note('libelle', `Libellé corrigé par la seconde lecture : ${m.replacements.map((r) => `« ${r.from} » → « ${r.to} »`).join(', ')}`);
        } else if (normText(info.libelleLines.join(' ')) === normText(bLines.join(' '))) {
          ok('libelle', 'Libellé confirmé par la seconde lecture');
        }
      }
    }
    return out;
  }


  /* ------------------------------------------------------------------ */
  /* Navigateur : moteur Tesseract embarqué, rendu des pages                */
  /* ------------------------------------------------------------------ */

  const hasDom = typeof document !== 'undefined' && typeof window !== 'undefined';
  const el = (id) => (hasDom ? document.getElementById(id) : null);

  /** Le moteur OCR est-il embarqué dans cette page et utilisable dans ce navigateur ? */
  function available() {
    return hasDom && typeof window.Tesseract !== 'undefined' && typeof WebAssembly === 'object' && typeof Worker !== 'undefined' &&
      !!el('tess-worker-src') && !!el('tess-core-src') && !!el('tess-lang-src');
  }

  function base64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /**
   * Démarre le moteur : un worker construit à partir des scripts embarqués (aucun chargement
   * réseau, fonctionne depuis un fichier local), modèle de langue fourni en mémoire.
   * Renvoie { recognize(image, psm) -> blocs Tesseract, terminate() }.
   */
  async function createEngine(opts) {
    opts = opts || {};
    if (!available()) throw new Error('OCR local non disponible dans cette page');
    // Le moteur (wasm) est concaténé devant le script du worker : TesseractCore est ainsi
    // déjà défini quand le worker démarre et il ne charge rien de l'extérieur.
    const workerPath = URL.createObjectURL(new Blob([el('tess-core-src').textContent, '\n', el('tess-worker-src').textContent], { type: 'application/javascript' }));
    const lang = base64ToBytes(el('tess-lang-src').textContent.replace(/\s+/g, ''));
    const worker = await window.Tesseract.createWorker([{ code: 'fra', data: lang }], 1, {
      workerPath,
      workerBlobURL: false,
      cacheMethod: 'none',
      logger: opts.logger || (() => {}),
      errorHandler: opts.onError || ((e) => console.warn('OCR local', e)),
    });
    let lastPsm = null;
    async function recognize(image, psm) {
      if (psm !== lastPsm) {
        await worker.setParameters({ tessedit_pageseg_mode: String(psm), preserve_interword_spaces: '1' });
        lastPsm = psm;
      }
      const { data } = await worker.recognize(image, {}, { blocks: true, text: false });
      return data.blocks || [];
    }
    return { recognize, terminate: () => worker.terminate() };
  }

  /** Rend une page pdf.js à l'échelle SCALE dans un canvas (image brute). */
  async function renderPage(pdfPage, scale) {
    const vp = pdfPage.getViewport({ scale: scale || SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    await pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    return canvas;
  }

  /** Canvas prétraité (traits effacés) à partir du canvas brut. */
  function preprocessCanvas(raw) {
    const img = raw.getContext('2d').getImageData(0, 0, raw.width, raw.height);
    const out = preprocess(img);
    const c = document.createElement('canvas');
    c.width = raw.width;
    c.height = raw.height;
    c.getContext('2d').putImageData(new ImageData(out.data, out.width, out.height), 0, 0);
    return c;
  }

  function cropCanvas(src, px, pad) {
    const c = document.createElement('canvas');
    c.width = px.w + 2 * pad;
    c.height = px.h + 2 * pad;
    const cx = c.getContext('2d');
    cx.fillStyle = '#fff';
    cx.fillRect(0, 0, c.width, c.height);
    cx.drawImage(src, px.x, px.y, px.w, px.h, pad, pad, px.w, px.h);
    return c;
  }

  /**
   * Relit les zones d'une pièce (info : analyzePage) sur le canvas brut de la page.
   * getPre() fournit (et met en cache) le canvas prétraité. Renvoie { zone: mots (points) }.
   */
  async function readZones(engine, raw, info, getPre) {
    const reads = {};
    const pad = PAD * SCALE;
    for (const z of zonesFor(info)) {
      const px = zonePixels(z.rect, raw.width, raw.height);
      if (!px) continue;
      const src = z.pre ? getPre() : raw;
      const blocks = await engine.recognize(cropCanvas(src, px, pad), z.psm);
      reads[z.name] = itemsFromBlocks(blocks, SCALE, px.x - pad, px.y - pad);
    }
    return reads;
  }

  /** Première passe sur une page sans couche texte : tous les mots de la page (image prétraitée). */
  async function readFullPage(engine, getPre) {
    const blocks = await engine.recognize(getPre(), 11);
    return itemsFromBlocks(blocks, SCALE, 0, 0);
  }

  return {
    SCALE,
    PAD,
    preprocess,
    zonesFor,
    zonePixels,
    itemsFromBlocks,
    cleanWords,
    readNo,
    readAmounts,
    readAccounts,
    readDate,
    mergeLibelle,
    suspiciousToken,
    crossRead,
    available,
    createEngine,
    renderPage,
    preprocessCanvas,
    readZones,
    readFullPage,
  };
});
