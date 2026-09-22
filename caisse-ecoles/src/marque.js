/*
 * La marque de la pièce : un petit code QR imprimé dans un coin de la fiche « PIÈCE COMPTABLE ».
 *
 * Il ne contient rien de confidentiel — ni nom, ni montant, ni libellé : seulement de quoi
 * retrouver la pièce dans les registres de ce PC. Une feuille qui traîne ou qui part chez un
 * tiers ne dit donc rien à personne.
 *
 *     CB1-2026-PLX9K2M3ABCDE
 *     │   │    └─ identifiant de la pièce, en majuscules
 *     │   └────── année du registre
 *     └────────── marque de l'application, pour ne pas confondre avec un autre code QR
 *
 * Les majuscules et le tiret ne sont pas un caprice : ce sont les seuls caractères du mode
 * « alphanumérique » du QR, qui tient en 25 modules de côté là où le mode octet en demanderait 29.
 * Imprimé à 16 mm, cela fait 0,64 mm par module — lisible par un copieur à 200 points par pouce,
 * et assez discret pour ne pas gêner la lecture de la fiche. L'identifiant produit par le registre
 * n'est fait que de chiffres et de minuscules : le passer en majuscules ne perd rien.
 *
 * Au scan, ce même code fait deux choses : il ouvre un document dans la pile (la page qui le porte
 * est la première d'une pièce) et il dit laquelle. Plus rien à deviner.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('qrcode-generator'), require('jsqr'));
  else root.CaisseMarque = factory(root.qrcode, root.jsQR);
})(typeof self !== 'undefined' ? self : this, function (qrcode, jsQR) {
  'use strict';

  // jsQR est publié en module : selon la façon dont il est chargé, la fonction est l'export
  // lui-même ou sa propriété « default ».
  const decodeQR = jsQR && (typeof jsQR === 'function' ? jsQR : jsQR.default);

  const PREFIXE = 'CB1';
  const CORRECTION = 'Q'; // 25 % de redondance : un pli, une agrafe ou une tache ne perdent pas la pièce
  const MARQUE_RE = /^CB1-(\d{4})-([A-Z0-9]{2,40})$/;

  /** Le texte à imprimer pour une pièce donnée, ou '' si on ne peut pas l'identifier. */
  function ecrire(annee, id) {
    const a = Number(annee);
    const i = String(id == null ? '' : id).trim().toUpperCase();
    if (!Number.isInteger(a) || a < 1990 || a > 2100) return '';
    if (!/^[A-Z0-9]{2,40}$/.test(i)) return '';
    return `${PREFIXE}-${a}-${i}`;
  }

  /** Ce qu'un code QR lu désigne : { annee, id }, ou null si ce n'est pas une marque à nous. */
  function lire(texte) {
    const t = String(texte == null ? '' : texte).trim().toUpperCase().replace(/\s+/g, '');
    const m = MARQUE_RE.exec(t);
    if (!m) return null;
    const annee = Number(m[1]);
    if (annee < 1990 || annee > 2100) return null;
    // l'identifiant est rendu tel que le registre l'écrit
    return { annee, id: m[2].toLowerCase() };
  }

  /* ---------------- Dessiner ---------------- */

  /** La grille du code : { n, noir(x, y) }. Lève si le texte ne tient pas dans un code QR. */
  function grille(texte) {
    const q = qrcode(0, CORRECTION); // 0 : la plus petite version qui suffit
    q.addData(String(texte), /^[0-9A-Z $%*+\-./:]*$/.test(String(texte)) ? 'Alphanumeric' : 'Byte');
    q.make();
    const n = q.getModuleCount();
    return { n, noir: (x, y) => q.isDark(y, x) }; // isDark prend (ligne, colonne)
  }

  /**
   * Les modules noirs regroupés en bandes horizontales. Dessiner 625 petits carrés grossit le PDF
   * pour rien : une ligne du code ne compte qu'une poignée de bandes.
   * Coordonnées en modules, origine en haut à gauche.
   */
  function bandes(texte) {
    const g = grille(texte);
    const out = [];
    for (let y = 0; y < g.n; y++) {
      let debut = -1;
      for (let x = 0; x <= g.n; x++) {
        const noir = x < g.n && g.noir(x, y);
        if (noir && debut < 0) debut = x;
        else if (!noir && debut >= 0) { out.push({ x: debut, y, w: x - debut, h: 1 }); debut = -1; }
      }
    }
    return { n: g.n, bandes: out };
  }

  /**
   * Imprime la marque sur une page pdf-lib. `x`, `y` : coin bas-gauche du code, en points ;
   * `taille` : côté du code, marge silencieuse comprise. Rend la place occupée.
   *
   * La marge silencieuse (quatre modules de blanc tout autour) n'est pas décorative : sans elle,
   * un lecteur ne distingue pas le code de ce qui l'entoure.
   */
  function dessiner(page, texte, opts) {
    opts = opts || {};
    const taille = Number(opts.taille) || 46;
    const marge = opts.marge == null ? 3 : Number(opts.marge);
    const g = bandes(texte);
    const total = g.n + marge * 2;
    const pas = taille / total;
    const x0 = Number(opts.x) || 0;
    const y0 = Number(opts.y) || 0;
    const rgb = opts.rgb;
    // fond blanc : la fiche est blanche, mais un code posé sur un cadre ou une trame ne se lit plus
    if (opts.fond !== false && rgb) {
      page.drawRectangle({ x: x0, y: y0, width: taille, height: taille, color: rgb(1, 1, 1) });
    }
    const noir = rgb ? rgb(0, 0, 0) : undefined;
    for (const b of g.bandes) {
      page.drawRectangle({
        x: x0 + (marge + b.x) * pas,
        // l'origine d'un PDF est en bas : la ligne 0 du code est tout en haut
        y: y0 + (marge + (g.n - 1 - b.y)) * pas,
        width: b.w * pas,
        height: pas,
        color: noir,
      });
    }
    return { x: x0, y: y0, taille, modules: g.n };
  }

  /* ---------------- Relire ---------------- */

  /**
   * Une image du code, telle qu'un scanner la verrait : RGBA, avec sa marge, éventuellement
   * pivotée, bruitée ou grisée. Sert aux essais — et à vérifier qu'on relit ce qu'on imprime.
   */
  function imageRGBA(texte, opts) {
    opts = opts || {};
    const px = Math.max(1, Math.round(opts.module || 4));
    const marge = opts.marge == null ? 4 : Number(opts.marge);
    const g = bandes(texte);
    const n = g.n + marge * 2;
    const cote = n * px;
    const gris = new Uint8Array(cote * cote).fill(255);
    for (const b of g.bandes) {
      for (let dy = 0; dy < px; dy++) {
        const y = (marge + b.y) * px + dy;
        const debut = y * cote + (marge + b.x) * px;
        gris.fill(0, debut, debut + b.w * px);
      }
    }
    let src = gris; let w = cote; let h = cote;
    if (opts.rotation) ({ gris: src, w, h } = pivoter(gris, cote, cote, opts.rotation));
    // le « PDF compact » du copieur écrase les nuances : on simule un gris sale et du bruit
    const contraste = opts.contraste == null ? 1 : Number(opts.contraste);
    const bruit = Number(opts.bruit) || 0;
    let graine = 12345;
    const alea = () => { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine / 0x7fffffff; };
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      let v = 128 + (src[i] - 128) * contraste;
      if (bruit) v += (alea() - 0.5) * 255 * bruit;
      v = Math.max(0, Math.min(255, v));
      data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v; data[i * 4 + 3] = 255;
    }
    return { data, width: w, height: h };
  }

  function pivoter(gris, w, h, deg) {
    const d = ((Number(deg) % 360) + 360) % 360;
    if (d === 0) return { gris, w, h };
    const nw = d === 180 ? w : h;
    const nh = d === 180 ? h : w;
    const out = new Uint8Array(nw * nh);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = gris[y * w + x];
        let nx; let ny;
        if (d === 90) { nx = h - 1 - y; ny = x; }
        else if (d === 180) { nx = w - 1 - x; ny = h - 1 - y; }
        else { nx = y; ny = w - 1 - x; }
        out[ny * nw + nx] = v;
      }
    }
    return { gris: out, w: nw, h: nh };
  }

  /** Découpe une zone d'une image RGBA. */
  function decouper(data, width, height, x, y, w, h) {
    x = Math.max(0, Math.min(width - 1, Math.round(x)));
    y = Math.max(0, Math.min(height - 1, Math.round(y)));
    w = Math.max(1, Math.min(width - x, Math.round(w)));
    h = Math.max(1, Math.min(height - y, Math.round(h)));
    const out = new Uint8ClampedArray(w * h * 4);
    for (let j = 0; j < h; j++) {
      const src = ((y + j) * width + x) * 4;
      out.set(data.subarray(src, src + w * 4), j * w * 4);
    }
    return { data: out, width: w, height: h };
  }

  /** Une seule tentative de lecture, sur l'image telle qu'elle est. */
  function decoder(data, width, height) {
    if (!decodeQR) return null;
    try {
      const r = decodeQR(data, width, height, { inversionAttempts: 'attemptBoth' });
      return r && r.data ? r.data : null;
    } catch (e) { return null; }
  }

  /**
   * Cherche la marque dans l'image d'une page entière. Rend { texte, marque } ou null.
   *
   * Une seule tentative, sur l'image complète. J'avais d'abord découpé la page en coins, en
   * supposant qu'un code occupant moins d'un centième de la feuille passerait inaperçu : mesure
   * faite, c'est faux. Le repérage de jsQR retrouve le code sur une A4 entière de 200 à 300 points
   * par pouce (400 ms au pire), et dans les cas où il échoue — contraste écrasé et page bruitée à
   * la fois — le découpage échoue exactement pareil. Du code en plus qui ne rattrape rien.
   */
  function chercher(data, width, height) {
    const texte = decoder(data, width, height);
    if (!texte) return null;
    const marque = lire(texte);
    return marque ? { texte, marque } : null;
  }

  return { PREFIXE, CORRECTION, ecrire, lire, grille, bandes, dessiner, imageRGBA, decouper, decoder, chercher };
});
