  // =====================================================================
  //  Écrire en Unicode : des polices incorporées dans les documents produits
  //  -------------------------------------------------------------------
  //  Les 14 polices standard d'un PDF ne savent écrire que le jeu WinAnsi : « ć »
  //  de Milošević y devenait « ? ». Et un PDF/A exige que toute police soit
  //  incorporée au fichier, ce que ces 14 polices ne sont pas. Le logiciel embarque
  //  donc trois familles libres (Arimo, Tinos, Cousine, de mêmes largeurs que
  //  Helvetica, Times et Courier), dont chaque document ne garde que les lettres
  //  utilisées. Cette écriture n'est choisie que quand elle est nécessaire :
  //  l'archivage en PDF/A, ou des caractères que les polices standard ne savent
  //  pas écrire. Le reste du temps, les documents gardent les polices standard,
  //  plus légères.
  // =====================================================================
  const FAMILLES_UNICODE = { Helvetica: 'sans', Times: 'serif', Courier: 'mono' };
  const ecriture = { unicode: false, actifs: 0, couverture: null };
  const policesDecompressees = new Map();

  async function decompresser(b64) {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const flux = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(flux).arrayBuffer());
  }
  function octetsDePolice(id) {
    if (!policesDecompressees.has(id)) {
      const e = document.getElementById('police-' + id);
      policesDecompressees.set(id, e ? decompresser(e.textContent.trim()) : Promise.reject(new Error('La police « ' + id + ' » n\'est pas dans cette copie du logiciel.')));
    }
    return policesDecompressees.get(id);
  }
  const styleDePolice = (gras, italique) => (gras ? (italique ? 'bi' : 'b') : (italique ? 'i' : 'r'));

  // Les caractères que les trois familles savent écrire : hors de cet ensemble,
  // un caractère est remplacé par « ? » et signalé, comme avec les polices standard.
  async function preparerEcritureUnicode() {
    if (ecriture.couverture) return;
    const ensembles = [];
    for (const fam of ['sans', 'serif', 'mono']) ensembles.push(new Set(window.fontkit.create(await octetsDePolice(fam + '-r')).characterSet));
    const commun = new Set();
    ensembles[0].forEach(c => { if (ensembles[1].has(c) && ensembles[2].has(c)) commun.add(c); });
    ecriture.couverture = commun;
  }

  // Écrire avec les polices incorporées pendant `travail`. Un compteur plutôt qu'un
  // simple indicateur : deux travaux qui se chevauchent (un export et la refonte du
  // sommaire d'un dossier) ne se coupent pas l'herbe sous le pied en se terminant.
  async function avecEcritureUnicode(actif, travail) {
    if (!(actif && FEAT.unicode)) return travail();
    ecriture.actifs++;
    ecriture.unicode = true;
    try {
      await preparerEcritureUnicode();
      return await travail();
    } finally { ecriture.actifs--; ecriture.unicode = ecriture.actifs > 0; }
  }

  async function policeUnicode(doc, cache, name, bold, italic) {
    const id = (FAMILLES_UNICODE[name] || 'sans') + '-' + styleDePolice(bold, italic);
    const k = 'U:' + id;
    if (cache.has(k)) return cache.get(k);
    if (!doc.__aktumFontkit) { doc.registerFontkit(window.fontkit); doc.__aktumFontkit = true; }
    const f = await doc.embedFont(await octetsDePolice(id), { subset: true });
    cache.set(k, f);
    return f;
  }

  // La police d'un document fabriqué sur place (sommaire d'un dossier, page de
  // garde) : incorporée quand l'écriture Unicode est possible, standard sinon.
  async function policeDeBase(doc, gras) {
    if (ecriture.unicode) {
      const cache = doc.__aktumPolices || (doc.__aktumPolices = new Map());
      return policeUnicode(doc, cache, 'Helvetica', gras, false);
    }
    return doc.embedFont(gras ? PDFLib.StandardFonts.HelveticaBold : PDFLib.StandardFonts.Helvetica);
  }
