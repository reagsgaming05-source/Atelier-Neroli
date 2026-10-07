  // =====================================================================
  //  Alléger les images
  //  -------------------------------------------------------------------
  //  « Réduire la taille » sans abîmer le texte : les images trop grosses pour ce qu'elles montrent (une photo de 4000 points sur une page
  //  A4, un scan à 600 ppp) sont réduites et recompressées en JPEG ; les pages, leurs polices et leur texte ne sont pas touchés. Une image
  //  n'est remplacée que si le résultat est nettement plus léger ; ni les masques, ni les images en CMYK ou à palette, ni les décodages
  //  particuliers ne sont retouchés.
  // =====================================================================
  async function alegerLesImages(doc, o) {
    const { PDFName, PDFNumber, PDFRawStream, PDFArray, decodePDFRawStream } = PDFLib;
    const ctx = doc.context, N = k => PDFName.of(k);
    const maxLong = Math.round((o.dpi || 150) * 11.7);   // la grande dimension d'une page A4 à cette résolution
    const bilan = { images: 0, retouchees: 0, avant: 0, apres: 0 };
    const nom = v => { const x = ctx.lookup(v); return x && x.toString ? x.toString() : ''; };
    const nb = v => { const x = ctx.lookup(v); return x instanceof PDFNumber ? x.asNumber() : 0; };
    const filtres = d => { const f = ctx.lookup(d.get(N('Filter'))); return !f ? [] : (f instanceof PDFArray ? f.asArray().map(nom) : [nom(f)]); };
    const composantes = d => {
      const cs = ctx.lookup(d.get(N('ColorSpace')));
      const n = nom(cs);
      if (n === '/DeviceRGB') return 3;
      if (n === '/DeviceGray') return 1;
      if (cs instanceof PDFArray && cs.size() >= 2 && nom(cs.get(0)) === '/ICCBased') {
        const prof = ctx.lookup(cs.get(1));
        const c = prof && prof.dict ? nb(prof.dict.get(N('N'))) : 0;
        return c === 3 || c === 1 ? c : 0;
      }
      return 0;   // CMYK, palette, Lab… : on n'y touche pas
    };
    const versJpeg = async (source, w, h, qualite) => {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cx = cv.getContext('2d', { alpha: false });
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h);
      cx.imageSmoothingQuality = 'high';
      if (source instanceof ImageData) { const t = document.createElement('canvas'); t.width = source.width; t.height = source.height; t.getContext('2d').putImageData(source, 0, 0); cx.drawImage(t, 0, 0, w, h); }
      else cx.drawImage(source, 0, 0, w, h);
      const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', qualite));
      return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
    };
    const objets = Array.from(ctx.enumerateIndirectObjects());
    for (const [ref, obj] of objets) {
      if (!(obj instanceof PDFRawStream)) continue;
      const d = obj.dict;
      if (nom(d.get(N('Subtype'))) !== '/Image') continue;
      if (nom(d.get(N('ImageMask'))) === 'true' || d.has(N('Decode')) || d.has(N('Mask'))) continue;
      const w = nb(d.get(N('Width'))), h = nb(d.get(N('Height')));
      if (!w || !h || nb(d.get(N('BitsPerComponent'))) !== 8) continue;
      const f = filtres(d);
      const taille = obj.contents.length;
      bilan.images++; bilan.avant += taille;
      let apres = null, w2 = w, h2 = h;
      try {
        const long = Math.max(w, h);
        const echelle = long > maxLong ? maxLong / long : 1;
        w2 = Math.max(1, Math.round(w * echelle)); h2 = Math.max(1, Math.round(h * echelle));
        if (f.length === 1 && f[0] === '/DCTDecode') {
          // un JPEG : seulement s'il y a de la place à gagner (trop grand, ou lourd pour sa surface)
          if (!composantes(d) || (echelle === 1 && taille < w * h * 0.25)) { bilan.apres += taille; continue; }
          const bmp = await createImageBitmap(new Blob([obj.contents], { type: 'image/jpeg' }));
          apres = await versJpeg(bmp, w2, h2, o.qualite || 0.72);
          if (bmp.close) bmp.close();
          if (apres && apres.length > taille * 0.9) apres = null;
        } else if (!f.length || f[0] === '/FlateDecode') {
          // un dessin ou une photo non compressée : lue, puis recompressée si le gain est net (la moitié au moins : un dessin net, qui
          // se comprime déjà bien sans perte, ne passe pas en JPEG)
          const n = composantes(d);
          if (!n || taille < 30000) { bilan.apres += taille; continue; }
          const brut = decodePDFRawStream(obj).decode();
          if (brut.length !== w * h * n) { bilan.apres += taille; continue; }
          const rgba = new Uint8ClampedArray(w * h * 4);
          for (let i = 0, j = 0, k = 0; i < w * h; i++, j += n, k += 4) {
            if (n === 3) { rgba[k] = brut[j]; rgba[k + 1] = brut[j + 1]; rgba[k + 2] = brut[j + 2]; }
            else { rgba[k] = rgba[k + 1] = rgba[k + 2] = brut[j]; }
            rgba[k + 3] = 255;
          }
          apres = await versJpeg(new ImageData(rgba, w, h), w2, h2, o.qualite || 0.72);
          if (apres && apres.length > taille * 0.5) apres = null;
        }
      } catch (e) { signaler('Alléger une image', e, 'info'); apres = null; }
      if (!apres) { bilan.apres += taille; continue; }
      obj.contents = apres;
      d.set(N('Filter'), N('DCTDecode'));
      d.delete(N('DecodeParms'));
      d.set(N('Width'), PDFNumber.of(w2)); d.set(N('Height'), PDFNumber.of(h2));
      d.set(N('ColorSpace'), N('DeviceRGB'));
      d.set(N('BitsPerComponent'), PDFNumber.of(8));
      d.set(N('Length'), PDFNumber.of(apres.length));
      bilan.retouchees++; bilan.apres += apres.length;
    }
    return bilan;
  }
