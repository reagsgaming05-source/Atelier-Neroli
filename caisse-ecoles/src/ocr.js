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
  const LETTER = /[A-Za-zÀ-ſ]/;

  /** Jeton de la couche texte probablement mal lu. */
  function suspiciousToken(tok, index) {
    if (GARBAGE_CHARS.test(tok)) return true;
    if (!/[A-Za-z0-9À-ſ]/.test(tok)) return !PUNCT_OK.test(tok);
    // mot inconnu du vocabulaire qui ressemble à une erreur de lecture (parser.unknownWords :
    // ignore les dates, classes, sigles et mots courts)
    if (index && LETTER.test(tok) && P.unknownWords(tok, index).length) return true;
    return false;
  }

  /** Jeton OCR utilisable comme remplacement : propre et sûr. */
  function cleanToken(tok, conf, index, minConf) {
    if (conf < (minConf == null ? 70 : minConf)) return false;
    if (GARBAGE_CHARS.test(tok)) return false;
    if (!/[A-Za-z0-9À-ſ]/.test(tok)) return PUNCT_OK.test(tok);
    if (index && LETTER.test(tok) && !/\d/.test(tok) && P.unknownWords(tok, index).length) return false;
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

  const normText = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[^a-z0-9À-ſ]+/g, '');

  /**
   * Mots OCR d'un lecteur qui occupent la place d'un jeton de la couche texte, dans l'ordre.
   * used : mots déjà consommés (par lecteur).
   */
  function candidatesAt(words, tok, used) {
    return words.filter((w) => !used.has(w) && sameLine(w, tok) && overlapX(w, tok) > Math.min(w.w, tok.w) * 0.3).sort((p, q) => p.x - q.x);
  }

  /**
   * Libellé de la couche texte (mots positionnés) corrigé par un ou plusieurs lecteurs OCR :
   * chaque jeton douteux est remplacé par les mots OCR qui occupent la même place, quand deux
   * lecteurs sont d'accord, ou qu'un seul lecteur propose un texte propre et sûr.
   * readers : liste de listes de mots OCR (points PDF). Renvoie { lines, replacements }.
   */
  function mergeLibelle(aWords, readers, index) {
    const lists = (Array.isArray(readers) && readers.length && Array.isArray(readers[0]) ? readers : [readers || []]).map((r) => cleanWords(r));
    const used = lists.map(() => new Set());
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
          const covered = used.some((u) => Array.from(u).some((w) => sameLine(w, t) && overlapX(w, t) > t.w * 0.5));
          if (!covered) outToks.push(t.str);
          continue;
        }
        // propositions de chaque lecteur
        const props = lists.map((words, i) => {
          const near = candidatesAt(words, t, used[i]);
          if (!near.length) return null;
          return { i, near, text: near.map((w) => w.str).join(' '), conf: Math.min.apply(null, near.map((w) => w.conf)), clean: near.every((w) => cleanToken(w.str, w.conf, index, 0)) };
        }).filter(Boolean);
        let chosen = null;
        // deux lecteurs d'accord (texte normalisé identique) et propre
        for (const pr of props) {
          const agree = props.filter((q) => q !== pr && normText(q.text) === normText(pr.text));
          if (agree.length && pr.clean) { chosen = pr; break; }
        }
        // sinon un seul lecteur, propre et sûr (confiance ≥ 70, ou ≥ 60 s'il est seul)
        if (!chosen) {
          const single = props.filter((pr) => pr.clean && pr.conf >= (props.length > 1 ? 70 : 70)).sort((p, q) => q.conf - p.conf)[0];
          if (single) chosen = single;
        }
        if (chosen) {
          for (const pr of props) if (normText(pr.text) === normText(chosen.text)) pr.near.forEach((w) => used[pr.i].add(w));
          replacements.push({ from: t.str, to: chosen.text });
          outToks.push(chosen.text);
        } else {
          outToks.push(t.str);
        }
      }
      const text = outToks.join(' ').replace(/\s+/g, ' ').trim();
      if (text) lines.push(text);
    }
    return { lines, replacements };
  }

  /* ------------------------------------------------------------------ */
  /* Confrontation des lectures (vote)                                      */
  /* ------------------------------------------------------------------ */

  /** Valeurs lues par un lecteur OCR dans ses zones. */
  function readerValues(reads) {
    reads = reads || {};
    return {
      no: reads.no ? readNo(reads.no) : null,
      total: reads.total ? (readAmounts(reads.total)[0] || null) : null,
      sommes: reads.somme ? readAmounts(reads.somme) : [],
      doit: reads.doit ? readAccounts(reads.doit) : [],
      avoir: reads.avoir ? readAccounts(reads.avoir) : [],
      date: reads.date ? readDate(reads.date) : null,
      libelle: reads.libelle || [],
    };
  }

  /**
   * Vote sur une valeur : votes = [{ src, value, conf }] (value null = rien lu).
   * Renvoie { agreed: valeur soutenue par ≥ 2 lecteurs (la plus soutenue), supporters, best :
   * meilleure valeur OCR isolée }.
   */
  function vote(votes) {
    const groups = new Map();
    for (const v of votes) {
      if (v.value == null) continue;
      const k = String(v.value);
      if (!groups.has(k)) groups.set(k, { value: v.value, srcs: [], conf: 0 });
      const g = groups.get(k);
      g.srcs.push(v.src);
      g.conf = Math.max(g.conf, v.conf || 0);
    }
    let agreed = null;
    for (const g of groups.values()) if (g.srcs.length >= 2 && (!agreed || g.srcs.length > agreed.srcs.length)) agreed = g;
    const best = Array.from(groups.values()).filter((g) => !g.srcs.includes('A')).sort((p, q) => q.conf - p.conf)[0] || null;
    return { agreed, best, groups };
  }

  /**
   * info    : résultat d'analyzePage sur la couche texte (lecteur A, peut être partiel).
   * readers : mots OCR par zone d'un lecteur { no, doit, … }, ou liste de lecteurs
   *           [{ name, reads }] (OCR local, Tesseract natif, relecture haute résolution…).
   * ctx     : { index, caisse }.
   * Renvoie une copie de info complétée/corrigée, avec crossFlags (constats par champ) et
   * crossChecked = true. Règles : une valeur soutenue par deux lectures est confirmée ; la
   * couche texte n'est corrigée que si les lectures OCR concordent entre elles et que la
   * correction est plausible (compte connu, total cohérent avec les sommes, n° mal lu) ;
   * sinon la divergence est signalée avec la valeur proposée.
   */
  function crossRead(info, readers, ctx) {
    ctx = ctx || {};
    const index = ctx.index || null;
    const known = new Set(index && index.accounts ? Array.from(index.accounts) : []);
    if (ctx.caisse) known.add(ctx.caisse);
    known.add(P.DEFAULT_CAISSE);
    const list = Array.isArray(readers) ? readers : [{ name: 'OCR local', reads: readers || {} }];
    const R = list.map((r) => ({ name: r.name || 'OCR', v: readerValues(r.reads) }));
    const names = (srcs) => srcs.filter((x) => x !== 'A').map((x) => R[Number(x)].name);
    const primaryB = info.source === 'ocr';
    const out = Object.assign({}, info, { crossFlags: [], crossChecked: true, readerCount: R.length });
    const flags = out.crossFlags;
    const ok = (field, message) => flags.push({ field, level: 'ok', message });
    const note = (field, message) => flags.push({ field, level: 'note', message });
    const doubt = (field, message, action) => flags.push({ field, level: 'doubt', message, action });
    const set = (field, value) => ({ type: 'set', field, value });
    const fmt = (v) => Number(v).toFixed(2);
    const label = (srcs) => `${srcs.length} lecture${srcs.length > 1 ? 's' : ''} (${srcs.map((x) => (x === 'A' ? 'couche texte' : R[Number(x)].name)).join(', ')})`;

    // ---- Numéro
    {
      const votes = [{ src: 'A', value: info.no, conf: 100 }].concat(R.map((r, i) => ({ src: String(i), value: r.v.no ? r.v.no.value : null, conf: r.v.no ? r.v.no.conf : 0 })));
      const { agreed, best } = vote(votes);
      if (info.no == null || primaryB) {
        const pick = agreed || best;
        if (pick && (info.no == null || pick.value !== info.no)) {
          out.no = pick.value; out.noRaw = String(pick.value);
          if (agreed && !agreed.srcs.includes('A')) ok('no', `N° ${pick.value} lu par ${label(agreed.srcs)}`);
          else note('no', `N° ${pick.value} lu par ${label(pick.srcs)}`);
        } else if (agreed && agreed.srcs.includes('A')) ok('no', `N° confirmé par ${label(agreed.srcs)}`);
      } else if (agreed && agreed.srcs.includes('A')) {
        ok('no', `N° confirmé par ${label(agreed.srcs)}`);
      } else if (agreed) {
        // les lectures OCR concordent contre la couche texte
        if (info.noRaw && /[^0-9\s]/.test(String(info.noRaw))) {
          out.no = agreed.value; out.noRaw = String(agreed.value);
          note('no', `N° ${agreed.value} retenu d'après ${label(agreed.srcs)} (couche texte : « ${String(info.noRaw).trim()} »)`);
        } else if (agreed.conf >= 80) {
          doubt('no', `N° lu ${info.no} dans la couche texte mais ${agreed.value} par ${label(agreed.srcs)} : à vérifier`, set('no', agreed.value));
        }
      } else if (best && best.conf >= 80 && R.length === 1) {
        doubt('no', `Deux lectures différentes du n° : ${info.no} (couche texte) et ${best.value} (${names(best.srcs).join(', ')}) : à vérifier`, set('no', best.value));
      }
    }

    // ---- Montant : le Total fait foi, les SOMME confirment
    {
      const aSommes = (info.sommes || []).map((s) => s.value).filter((v) => v != null);
      const sumOf = (vals) => (vals.length ? P.round2(vals.reduce((x, y) => x + y, 0)) : null);
      const votes = [{ src: 'A', value: info.total, conf: 100 }].concat(R.map((r, i) => {
        const t = r.v.total || (r.v.sommes.length === 1 ? r.v.sommes[0] : null);
        return { src: String(i), value: t ? t.value : null, conf: t ? t.conf : 0 };
      }));
      const { agreed, best } = vote(votes);
      const sommesAll = aSommes.concat(R.flatMap((r) => r.v.sommes.map((x) => x.value)));
      const plausible = (v) => sommesAll.includes(v) || R.some((r) => sumOf(r.v.sommes.map((x) => x.value)) === v) || sumOf(aSommes) === v;
      if (info.total != null && !primaryB) {
        if (agreed && agreed.srcs.includes('A')) ok('montant', `Montant confirmé par ${label(agreed.srcs)}`);
        else if (!agreed && R.some((r) => r.v.sommes.some((x) => x.value === info.total))) ok('montant', 'Montant confirmé par la seconde lecture (colonne SOMME)');
        else if (agreed && plausible(agreed.value) && !plausible(info.total)) {
          out.total = agreed.value; out.totalRaw = String(agreed.value);
          note('montant', `Montant ${fmt(agreed.value)} retenu d'après ${label(agreed.srcs)}, cohérent avec la colonne SOMME (couche texte : ${fmt(info.total)})`);
        } else if (agreed) {
          doubt('montant', `Montant lu ${fmt(info.total)} dans la couche texte mais ${fmt(agreed.value)} par ${label(agreed.srcs)} : à vérifier`, set('montant', agreed.value));
        } else if (best && best.conf >= 50 && R.length === 1) {
          doubt('montant', `Deux lectures différentes du montant : ${fmt(info.total)} (couche texte) et ${fmt(best.value)} (${names(best.srcs).join(', ')}) : à vérifier`, set('montant', best.value));
        }
      } else {
        const pick = agreed || best;
        if (pick && pick.value !== info.total) {
          const lenient = info.totalLenient != null ? info.totalLenient : null;
          if ((agreed && !agreed.srcs.includes('A')) || plausible(pick.value) || lenient === pick.value) {
            out.total = pick.value; out.totalRaw = String(pick.value);
            if (R.length > 1 || plausible(pick.value)) ok('montant', `Montant ${fmt(pick.value)} lu par ${label(pick.srcs)}${plausible(pick.value) ? ', cohérent avec la colonne SOMME' : ''}`);
            else note('montant', `Total ${fmt(pick.value)} lu par ${label(pick.srcs)} : illisible dans la couche texte`);
          } else if (pick.conf >= 60 && (!aSommes.length || primaryB)) {
            out.total = pick.value; out.totalRaw = String(pick.value);
            note('montant', `Total ${fmt(pick.value)} lu par ${label(pick.srcs)} : illisible dans la couche texte`);
          } else {
            doubt('montant', `Total ${fmt(pick.value)} lu par ${label(pick.srcs)}${aSommes.length ? `, différent de la somme ${aSommes.map(fmt).join(', ')} de la couche texte` : ' (lecture peu sûre)'} : à vérifier`, set('montant', pick.value));
          }
        } else if (agreed && agreed.srcs.includes('A')) ok('montant', `Montant confirmé par ${label(agreed.srcs)}`);
      }
    }

    // ---- Comptes (ensemble des comptes DOIT + AVOIR)
    {
      const aAcc = uniq((info.doit || []).concat(info.avoir || []));
      const sets = R.map((r) => ({ doit: uniq(r.v.doit.map((a) => a.value)), avoir: uniq(r.v.avoir.map((a) => a.value)) }));
      const key = (arr) => arr.slice().sort().join(',');
      const votes = [{ src: 'A', value: aAcc.length ? key(aAcc) : null, conf: 100 }].concat(sets.map((st, i) => { const all = uniq(st.doit.concat(st.avoir)); return { src: String(i), value: all.length ? key(all) : null, conf: 100 }; }));
      const { agreed, best } = vote(votes);
      const setOf = (k) => k.split(',');
      const allKnown = (arr) => arr.every((a) => known.has(a));
      if (!aAcc.length || primaryB) {
        const pick = agreed || best;
        if (pick && pick.value !== votes[0].value) {
          const i = Number(pick.srcs.find((x) => x !== 'A'));
          out.doit = sets[i].doit; out.avoir = sets[i].avoir;
          if (agreed && !agreed.srcs.includes('A')) ok('compte', `Comptes lus par ${label(agreed.srcs)} : ${setOf(pick.value).join(', ')}`);
          else note('compte', `Comptes lus par ${label(pick.srcs)} : ${setOf(pick.value).join(', ')}`);
        } else if (agreed && agreed.srcs.includes('A')) ok('compte', `Comptes confirmés par ${label(agreed.srcs)}`);
      } else if (agreed && agreed.srcs.includes('A')) {
        ok('compte', `Comptes confirmés par ${label(agreed.srcs)}`);
      } else {
        // divergence : on compare compte par compte
        const alt = agreed || best;
        if (alt) {
          const bAcc = setOf(alt.value);
          const onlyA = aAcc.filter((a) => !bAcc.includes(a));
          const onlyB = bAcc.filter((a) => !aAcc.includes(a));
          if (!onlyA.length && !onlyB.length) ok('compte', `Comptes confirmés par ${label(alt.srcs)}`);
          else if (onlyA.length && onlyB.length) {
            const aUnknown = onlyA.filter((a) => !known.has(a));
            const bKnown = onlyB.filter((a) => known.has(a));
            if (agreed && aUnknown.length && allKnown(onlyB) && onlyA.length === onlyB.length) {
              // les lectures OCR concordent sur des comptes connus, la couche texte donne un compte inconnu
              const i = Number(agreed.srcs.find((x) => x !== 'A'));
              out.doit = sets[i].doit; out.avoir = sets[i].avoir;
              note('compte', `Compte ${onlyB.join(', ')} retenu d'après ${label(agreed.srcs)} (couche texte : ${onlyA.join(', ')}, inconnu)`);
            } else if (bKnown.length || aUnknown.length) {
              doubt('compte', `Compte lu ${onlyA.join(', ')} dans la couche texte mais ${onlyB.join(', ')} par ${label(alt.srcs)} : à vérifier`, set('compte', (bKnown[0] || onlyB[0])));
            }
          } else if (onlyB.length && agreed && onlyB.some((a) => known.has(a))) {
            doubt('compte', `Compte supplémentaire lu par ${label(agreed.srcs)} : ${onlyB.join(', ')} : à vérifier`);
          }
        }
      }
    }

    // ---- Date
    {
      const votes = [{ src: 'A', value: info.date, conf: 100 }].concat(R.map((r, i) => ({ src: String(i), value: r.v.date ? r.v.date.value : null, conf: r.v.date ? r.v.date.conf : 0 })));
      const { agreed, best } = vote(votes);
      const disp = P.isoToDisplay;
      if (!info.date || primaryB) {
        const pick = agreed || best;
        if (pick && pick.value !== info.date) {
          out.date = pick.value; out.dateRaw = String(pick.value);
          if (agreed && !agreed.srcs.includes('A')) ok('date', `Date ${disp(pick.value)} lue par ${label(agreed.srcs)}`);
          else note('date', `Date ${disp(pick.value)} lue par ${label(pick.srcs)}`);
        } else if (agreed && agreed.srcs.includes('A')) ok('date', `Date confirmée par ${label(agreed.srcs)}`);
      } else if (agreed && agreed.srcs.includes('A')) {
        ok('date', `Date confirmée par ${label(agreed.srcs)}`);
      } else if (agreed) {
        const damaged = info.dateRaw && !/^\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s*$/.test(String(info.dateRaw));
        if (damaged) {
          out.date = agreed.value; out.dateRaw = String(agreed.value);
          note('date', `Date ${disp(agreed.value)} retenue d'après ${label(agreed.srcs)} (couche texte : « ${String(info.dateRaw).trim()} »)`);
        } else {
          doubt('date', `Date lue ${disp(info.date)} dans la couche texte mais ${disp(agreed.value)} par ${label(agreed.srcs)} : à vérifier`, set('date', agreed.value));
        }
      } else if (best && R.length === 1) {
        doubt('date', `Deux lectures différentes de la date : ${disp(info.date)} (couche texte) et ${disp(best.value)} (${names(best.srcs).join(', ')}) : à vérifier`, set('date', best.value));
      }
    }

    // ---- Libellé
    {
      const lists = R.map((r) => r.v.libelle).filter((l) => l && l.length);
      if (lists.length) {
        const bLines = P.groupLines(cleanWords(lists[0])).map((l) => l.text).filter((t) => /[A-Za-z0-9]/.test(t));
        if (!(info.libelleLines || []).length || primaryB) {
          if (bLines.length) out.libelleLines = bLines;
          if (!(info.libelleLines || []).length) note('libelle', `Libellé lu par ${R[0].name}`);
        } else if (info.libelleWords && info.libelleWords.length) {
          const m = mergeLibelle(info.libelleWords, lists, index);
          if (m.replacements.length) {
            out.libelleLines = m.lines;
            note('libelle', `Libellé corrigé par les lectures OCR : ${m.replacements.map((r) => `« ${r.from} » → « ${r.to} »`).join(', ')}`);
          } else if (lists.some((l) => normText(info.libelleLines.join(' ')) === normText(P.groupLines(cleanWords(l)).map((x) => x.text).join(' ')))) {
            ok('libelle', 'Libellé confirmé par une lecture OCR');
          }
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

  /** Mots d'un lecteur natif (TSV : text, conf, x0, y0, x1, y1 en pixels du découpage) -> points PDF. */
  function itemsFromNative(words, scale, dx, dy) {
    scale = scale || SCALE;
    const out = [];
    for (const w of words || []) {
      const str = String(w.text || '').trim();
      if (!str) continue;
      out.push({ str, conf: Math.round(w.conf || 0), x: (w.x0 + (dx || 0)) / scale, y: (w.y1 + (dy || 0)) / scale, w: (w.x1 - w.x0) / scale, h: (w.y1 - w.y0) / scale });
    }
    return out;
  }

  function canvasPng(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('image vide')); return; }
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)), reject);
      }, 'image/png');
    });
  }

  // Zones numériques ; le moteur historique (oem 0) n'est fiable que sur le total et la date
  // (mesuré : 101/106 et 103/106 sans lecture fausse, contre 91/106 sur le n° avec des erreurs
  // sûres d'elles) : on ne lui confie que celles-là.
  const NUMERIC_ZONES = ['no', 'doit', 'somme', 'avoir', 'total', 'date'];
  const LEGACY_ZONES = ['somme', 'total', 'date'];

  /**
   * Relecture des zones d'une pièce par le lecteur natif. recognize(png, { psm, oem, lang, dpi })
   * renvoie des mots TSV. opts : { oem, lang, numericOnly }.
   */
  async function readZonesNative(recognize, raw, info, getPre, opts) {
    opts = opts || {};
    const reads = {};
    const pad = PAD * SCALE;
    // les zones sont envoyées ensemble : le processus principal en lit plusieurs en parallèle
    const jobs = [];
    for (const z of zonesFor(info)) {
      if (opts.numericOnly && !(opts.oem === 0 ? LEGACY_ZONES : NUMERIC_ZONES).includes(z.name)) continue;
      const px = zonePixels(z.rect, raw.width, raw.height);
      if (!px) continue;
      const src = z.pre ? getPre() : raw;
      jobs.push(canvasPng(cropCanvas(src, px, pad))
        .then((png) => recognize(png, { psm: z.psm, oem: opts.oem == null ? 1 : opts.oem, lang: opts.lang || 'fra', dpi: Math.round(72 * SCALE) }))
        .then((words) => { reads[z.name] = itemsFromNative(words, SCALE, px.x - pad, px.y - pad); }));
    }
    await Promise.all(jobs);
    return reads;
  }

  /**
   * Relecture à haute résolution (5 × 72 = 360 dpi, image brute) de zones précises, par le
   * lecteur natif : utilisée quand les lectures divergent.
   */
  async function readZonesHiRes(recognize, pdfPage, info, zoneNames, opts) {
    opts = opts || {};
    const scale = 5;
    const raw = await renderPage(pdfPage, scale);
    const reads = {};
    const pad = PAD * scale;
    const jobs = [];
    for (const z of zonesFor(info)) {
      if (!zoneNames.includes(z.name)) continue;
      const px = zonePixels(z.rect, raw.width, raw.height, scale);
      if (!px) continue;
      jobs.push(canvasPng(cropCanvas(raw, px, pad))
        .then((png) => recognize(png, { psm: z.psm, oem: opts.oem == null ? 1 : opts.oem, lang: opts.lang || 'fra', dpi: 72 * scale }))
        .then((words) => { reads[z.name] = itemsFromNative(words, scale, px.x - pad, px.y - pad); }));
    }
    await Promise.all(jobs);
    return reads;
  }

  /** Zones à relire pour un champ dont les lectures divergent. */
  function zonesForField(field) {
    return { no: ['no'], montant: ['total', 'somme'], compte: ['doit', 'avoir'], date: ['date'] }[field] || [];
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
    readerValues,
    vote,
    crossRead,
    available,
    createEngine,
    renderPage,
    preprocessCanvas,
    readZones,
    readFullPage,
    itemsFromNative,
    readZonesNative,
    readZonesHiRes,
    zonesForField,
    NUMERIC_ZONES,
    LEGACY_ZONES,
  };
});
