  // =====================================================================
  //  Couleurs relevées sur une page
  //  -------------------------------------------------------------------
  //  Pour qu'un texte corrigé garde l'encre et le fond de la ligne qu'il
  //  remplace : lecture des pixels d'une zone rendue, couleur dominante du
  //  fond et de l'encre, conversions. Rien ici ne dépend de l'éditeur :
  //  des pixels en entrée, des couleurs en sortie.
  // =====================================================================

  const hexRVB = t => '#' + t.map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');

  const lumRVB = c => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

  const ecartRVB = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  // Le morceau de rendu net qui correspond exactement à une zone de la page.
  function edPixels(zone, net) {
    const k = net.echelle;
    const x = Math.max(0, Math.round((zone.x - net.x0) * k));
    const y = Math.max(0, Math.round((zone.y - net.y0) * k));
    const w = Math.min(net.cv.width - x, Math.round(zone.w * k));
    const h = Math.min(net.cv.height - y, Math.round(zone.h * k));
    if (w < 2 || h < 2) return null;
    return { d: net.cv.getContext('2d', { willReadFrequently: true }).getImageData(x, y, w, h), w, h, k };
  }

  // Couleur du fond et couleur de l'encre, relevées sur ce rendu net.
  // L'encre n'est pas forcément plus sombre que le fond : un bandeau de
  // couleur porte souvent un texte blanc. On cherche donc la teinte la plus
  // éloignée du fond, dans un sens comme dans l'autre.
  function edCouleurs(zone, net) {
    const defaut = { fond: '#FFFFFF', encre: '#111111' };
    if (!net) return defaut;
    try {
      const px = edPixels({ x: zone.x - 2, y: zone.y - 2, w: zone.w + 4, h: zone.h + 4 }, net);
      if (!px) return defaut;
      const d = px.d.data;

      // Fond : la teinte la plus répandue. Moyenne des vrais pixels du
      // groupe dominant, pas du centre de son intervalle, sinon un blanc pur
      // ressortirait en gris très clair et le recouvrement se verrait.
      const compte = new Map();
      for (let i = 0; i < d.length; i += 4) {
        const cle = (d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4);
        const e = compte.get(cle) || { n: 0, r: 0, v: 0, b: 0 };
        e.n++; e.r += d[i]; e.v += d[i + 1]; e.b += d[i + 2];
        compte.set(cle, e);
      }
      let meilleur = null, mieux = -1;
      compte.forEach(e => { if (e.n > mieux) { mieux = e.n; meilleur = e; } });
      const fond = [meilleur.r / meilleur.n, meilleur.v / meilleur.n, meilleur.b / meilleur.n].map(Math.round);
      if (fond.every(v => v >= 250)) { fond[0] = fond[1] = fond[2] = 255; }

      // Encre : la moyenne du cœur des lettres, c'est-à-dire des pixels les
      // plus éloignés du fond. Les bords lissés fausseraient la teinte.
      let loin = 0;
      const ecarts = new Float32Array(d.length / 4);
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        const e = Math.hypot(d[i] - fond[0], d[i + 1] - fond[1], d[i + 2] - fond[2]);
        ecarts[j] = e;
        if (e > loin) loin = e;
      }
      // Une zone sans encre — un blanc entre deux mots — ne doit rien
      // imposer : sinon le morceau serait écrit en blanc sur blanc.
      if (loin < 26) return { fond: hexRVB(fond), encre: null };
      const seuil = Math.max(loin * 0.55, 24);
      const coeur = [];
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        if (ecarts[j] >= seuil) coeur.push([ecarts[j], d[i], d[i + 1], d[i + 2]]);
      }
      if (coeur.length < 4) return { fond: hexRVB(fond), encre: null };
      coeur.sort((a, b) => b[0] - a[0]);
      const gros = coeur.slice(0, Math.max(4, Math.round(coeur.length * 0.2)));
      const somme = gros.reduce((acc, q) => [acc[0] + q[1], acc[1] + q[2], acc[2] + q[3]], [0, 0, 0]);
      let encre = somme.map(v => v / gros.length);
      // À l'écran, un texte de petite taille n'atteint jamais sa vraie
      // densité : on pousse la teinte jusqu'au pixel le plus franc.
      const vu = ecartRVB(encre, fond);
      if (vu > 1 && loin > vu) {
        const f = loin / vu;
        encre = encre.map((v, i) => fond[i] + (v - fond[i]) * f);
      }
      return { fond: hexRVB(fond), encre: hexRVB(encre) };
    } catch (_) { return defaut; }
  }

  // Le fond d'un bloc n'est pas toujours uni : un aplat de couleur, un
  // dégradé, la trame d'une ligne de tableau. On le relève tel quel en
  // effaçant les lettres — chaque pixel d'encre est remplacé par le fond qui
  // l'entoure — puis on le repose sous le texte corrigé. Quand tout est de
  // la même teinte, on s'en tient à un aplat : bien plus léger.
  function edFond(zone, net, corps, couleurs) {
    const uni = { img: null, uni: (couleurs && couleurs.fond) || '#FFFFFF' };
    if (!net) return uni;
    try {
      const px = edPixels(zone, net);
      if (!px) return uni;
      // On travaille en basse définition : un fond est lisse, et le filtre
      // coûterait cher sur le rendu net.
      const vise = Math.min(2.4, px.k);
      const W = Math.max(8, Math.min(1400, Math.round(zone.w * vise)));
      const H = Math.max(4, Math.min(1400, Math.round(zone.h * vise)));
      const petit = document.createElement('canvas');
      petit.width = W; petit.height = H;
      const pc = petit.getContext('2d', { alpha: false, willReadFrequently: true });
      const tampon = document.createElement('canvas');
      tampon.width = px.w; tampon.height = px.h;
      tampon.getContext('2d').putImageData(px.d, 0, 0);
      pc.drawImage(tampon, 0, 0, W, H);
      const im = pc.getImageData(0, 0, W, H);
      const src = im.data;

      // L'encre est-elle plus claire ou plus sombre que le fond ? On garde,
      // dans chaque fenêtre, le pixel qui ressemble le plus au fond.
      const encreClaire = couleurs && couleurs.encre
        ? lumRVB(lireHex(couleurs.encre)) > lumRVB(lireHex(couleurs.fond))
        : false;
      const mieux = encreClaire ? (a, b) => a < b : (a, b) => a > b;
      const ech = W / Math.max(1, zone.w);
      const rayonX = Math.max(3, Math.min(48, Math.round((corps || 11) * ech * 0.85)));
      const rayonY = Math.max(2, Math.min(32, Math.round((corps || 11) * ech * 0.7)));

      const lum = new Float32Array(W * H);
      for (let j = 0, i = 0; j < W * H; j++, i += 4) lum[j] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
      const passe = (entree, lumEntree, rayon, horizontal) => {
        const sortie = new Uint8ClampedArray(entree.length);
        const lumSortie = new Float32Array(W * H);
        const n1 = horizontal ? H : W, n2 = horizontal ? W : H;
        for (let a = 0; a < n1; a++) {
          for (let b = 0; b < n2; b++) {
            let best = -1, bestLum = 0;
            const d0 = Math.max(0, b - rayon), d1 = Math.min(n2 - 1, b + rayon);
            for (let c = d0; c <= d1; c++) {
              const j = horizontal ? a * W + c : c * W + a;
              if (best < 0 || mieux(lumEntree[j], bestLum)) { best = j; bestLum = lumEntree[j]; }
            }
            const j = horizontal ? a * W + b : b * W + a;
            sortie[j * 4] = entree[best * 4];
            sortie[j * 4 + 1] = entree[best * 4 + 1];
            sortie[j * 4 + 2] = entree[best * 4 + 2];
            sortie[j * 4 + 3] = 255;
            lumSortie[j] = bestLum;
          }
        }
        return { d: sortie, l: lumSortie };
      };
      let r = passe(src, lum, rayonX, true);
      r = passe(r.d, r.l, rayonY, false);

      // Le filtre déborde : au bord d'un aplat de couleur il ramène la teinte
      // voisine vers l'intérieur, et l'aplat paraît rétréci. On ne remplace
      // donc QUE les pixels d'encre ; tout le reste garde sa couleur exacte,
      // bords francs compris.
      const encre = new Uint8Array(W * H);
      for (let j = 0, i = 0; j < W * H; j++, i += 4) {
        const e = Math.hypot(src[i] - r.d[i], src[i + 1] - r.d[i + 1], src[i + 2] - r.d[i + 2]);
        if (e > 16) encre[j] = 1;
      }
      // Les bords lissés d'une lettre sont à peine plus clairs que l'encre :
      // on élargit d'un pixel pour ne pas laisser de halo.
      const large = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!encre[y * W + x]) continue;
          for (let dy = -1; dy <= 1; dy++) {
            const yy = y + dy; if (yy < 0 || yy >= H) continue;
            for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx; if (xx < 0 || xx >= W) continue;
              large[yy * W + xx] = 1;
            }
          }
        }
      }
      const lisse = new Uint8ClampedArray(src.length);
      for (let j = 0, i = 0; j < W * H; j++, i += 4) {
        const de = large[j] ? r.d : src;
        lisse[i] = de[i]; lisse[i + 1] = de[i + 1]; lisse[i + 2] = de[i + 2]; lisse[i + 3] = 255;
      }
      // Un lissage, mais seulement là où une lettre a été effacée : ailleurs
      // la page doit rester telle qu'elle est.
      for (let tour = 0; tour < 2; tour++) {
        const avant = lisse.slice();
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const j = y * W + x;
            if (!large[j]) continue;
            let sr = 0, sv = 0, sb = 0, n = 0;
            for (let dy = -1; dy <= 1; dy++) {
              const yy = y + dy; if (yy < 0 || yy >= H) continue;
              for (let dx = -1; dx <= 1; dx++) {
                const xx = x + dx; if (xx < 0 || xx >= W) continue;
                const k = (yy * W + xx) * 4;
                sr += avant[k]; sv += avant[k + 1]; sb += avant[k + 2]; n++;
              }
            }
            const i = j * 4;
            lisse[i] = sr / n; lisse[i + 1] = sv / n; lisse[i + 2] = sb / n;
          }
        }
      }

      // Fond uni : inutile d'embarquer une image dans le PDF.
      let minR = 255, maxR = 0, minV = 255, maxV = 0, minB = 255, maxB = 0;
      let sR = 0, sV = 0, sB = 0;
      for (let j = 0; j < lisse.length; j += 4) {
        if (lisse[j] < minR) minR = lisse[j]; if (lisse[j] > maxR) maxR = lisse[j];
        if (lisse[j + 1] < minV) minV = lisse[j + 1]; if (lisse[j + 1] > maxV) maxV = lisse[j + 1];
        if (lisse[j + 2] < minB) minB = lisse[j + 2]; if (lisse[j + 2] > maxB) maxB = lisse[j + 2];
        sR += lisse[j]; sV += lisse[j + 1]; sB += lisse[j + 2];
      }
      const n = lisse.length / 4;
      const moyen = [sR / n, sV / n, sB / n];
      // Le seuil est serré : deux teintes voisines moyennées en une seule
      // donnent une bande grisâtre là où la page était blanche. Au moindre
      // doute, on recopie le fond plutôt que de l'approcher.
      if (Math.max(maxR - minR, maxV - minV, maxB - minB) <= 3) {
        const plat = moyen.map(Math.round);
        if (plat.every(v => v >= 248)) { plat[0] = plat[1] = plat[2] = 255; }
        return { img: null, uni: hexRVB(plat) };
      }
      pc.putImageData(new ImageData(lisse, W, H), 0, 0);
      return { img: petit.toDataURL('image/png'), uni: hexRVB(moyen), w: W, h: H };
    } catch (e) { console.error(e); return uni; }
  }

  function lireHex(h) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(h || ''));
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255];
  }
