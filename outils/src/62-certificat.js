  // =====================================================================
  //  Signer un PDF avec un certificat personnel (fichier .p12 ou .pfx)
  //  -------------------------------------------------------------------
  //  Le certificat que l'administration ou un prestataire a remis à une personne
  //  pour signer : un fichier PKCS#12 protégé par un mot de passe. Il est lu ici,
  //  sur le poste ; la clé n'en sort jamais, n'est jamais gardée, et le mot de
  //  passe est demandé à chaque signature. La signature est une signature
  //  numérique PDF ordinaire (PKCS#7 détachée, SHA-256) que les lecteurs usuels
  //  vérifient.
  //
  //  Ce que c'est, et ce que ce n'est pas : la signature prouve que le document
  //  n'a pas changé depuis, et qu'elle a été faite avec la clé de ce certificat.
  //  Sa valeur juridique dépend du certificat — un certificat qualifié d'un
  //  prestataire reconnu, un certificat d'entreprise, ou un certificat quelconque
  //  — et non de ce logiciel. La date est celle de l'horloge du poste : sans
  //  horodatage d'une autorité de temps (qui demanderait internet), elle n'est
  //  pas prouvée. Seules les clés RSA sont prises en charge.
  // =====================================================================
  // @debut-certificat
  const CERTIFICAT_TAILLE_SIGNATURE = 12000;   // octets réservés à la signature (24 000 chiffres hexadécimaux)
  const binaireDe = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return s; };
  const octetsDe = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  const latin1 = t => String(t == null ? '' : t).replace(/[^\x20-\x7e -ÿ]/g, '?');
  const echapperPdf = t => latin1(t).replace(/([\\()])/g, '\\$1');

  // Lire un fichier PKCS#12 : { cle, certificat, chaine, resume }. Les erreurs sont dites en clair.
  function certificatLire(p12, motDePasse) {
    const F = forge;
    let pkcs12;
    try {
      const asn1 = F.asn1.fromDer(F.util.createBuffer(binaireDe(p12)));
      pkcs12 = F.pkcs12.pkcs12FromAsn1(asn1, false, motDePasse || '');
    } catch (e) {
      const m = String(e && e.message ? e.message : e);
      if (/mac could not be verified|invalid password|decrypt|padding/i.test(m)) throw new Error('Mot de passe incorrect (ou fichier abîmé).');
      if (/unsupported|not supported|unknown/i.test(m)) throw new Error('Ce fichier utilise un chiffrement que ce logiciel ne sait pas lire (' + m + ').');
      throw new Error('Ce fichier n\'est pas un certificat .p12 ou .pfx lisible (' + m + ').');
    }
    const sacs = (type) => {
      const l = [];
      const par = pkcs12.getBags({ bagType: type });
      (par[type] || []).forEach(b => l.push(b));
      return l;
    };
    const cles = sacs(F.pki.oids.pkcs8ShroudedKeyBag).concat(sacs(F.pki.oids.keyBag)).filter(b => b.key);
    if (!cles.length) throw new Error('Ce fichier ne contient pas de clé RSA lisible : les clés d\'un autre type (courbes elliptiques) ne sont pas prises en charge par ce logiciel.');
    const cle = cles[0].key;
    const certs = sacs(F.pki.oids.certBag).map(b => b.cert).filter(Boolean);
    const memeCle = c => c.publicKey && c.publicKey.n && c.publicKey.n.equals(cle.n) && c.publicKey.e.equals(cle.e);
    const certificat = certs.find(memeCle);
    if (!certificat) throw new Error('Ce fichier contient une clé, mais pas le certificat qui lui correspond.');
    // La chaîne : les certificats qui délivrent le signataire, de proche en proche.
    const chaine = [];
    let courant = certificat;
    for (let i = 0; i < 8; i++) {
      const parent = certs.find(c => c !== courant && !chaine.includes(c) && c.subject.hash === courant.issuer.hash);
      if (!parent || parent === certificat) break;
      chaine.push(parent);
      courant = parent;
    }
    const champ = (n, k) => { const a = n.getField(k); return a ? a.value : ''; };
    const maintenant = new Date();
    const resume = {
      sujet: champ(certificat.subject, 'CN') || certificat.subject.attributes.map(a => a.value).join(', '),
      organisation: champ(certificat.subject, 'O'), emetteur: champ(certificat.issuer, 'CN') || champ(certificat.issuer, 'O'),
      du: certificat.validity.notBefore, au: certificat.validity.notAfter,
      autoSigne: certificat.subject.hash === certificat.issuer.hash,
      expire: maintenant > certificat.validity.notAfter, pasEncoreValide: maintenant < certificat.validity.notBefore,
      chaine: chaine.length,
    };
    return { cle, certificat, chaine, resume };
  }

  // Le cartouche d'une signature visible : une phrase par ligne.
  function cartoucheSignature(resume, o) {
    const jour = o.date.toLocaleDateString(regionLocale(), { day: 'numeric', month: 'long', year: 'numeric' });
    const heure = o.date.toLocaleTimeString(regionLocale(), { hour: '2-digit', minute: '2-digit' });
    const lignes = [tr('Signé numériquement par'), resume.sujet + (resume.organisation && resume.organisation !== resume.sujet ? ', ' + resume.organisation : ''), tr('le ' + jour + ' à ' + heure)];
    if (o.raison) lignes.push(o.raison);
    if (o.lieu) lignes.push(o.lieu);
    return lignes;
  }

  // Signer les octets d'un PDF. o : { certificat (résultat de certificatLire), raison, lieu, date,
  // visible: { page (1-based), coin: 'bas-droite'|'bas-gauche'|'haut-droite'|'haut-gauche', largeur, hauteur } | null }.
  async function signerPdf(octets, o) {
    const F = forge;
    const { PDFDocument, PDFName, PDFDict, PDFArray, PDFHexString, PDFString, PDFNumber, StandardFonts } = PDFLib;
    const date = o.date || new Date();
    const doc = await PDFDocument.load(octets, { updateMetadata: false });
    const ctx = doc.context;
    const pages = doc.getPages();
    const resume = o.certificat.resume;
    const sig = ctx.register(ctx.obj({
      Type: 'Sig', Filter: 'Adobe.PPKLite', SubFilter: 'adbe.pkcs7.detached',
      ByteRange: [0, 9999999999, 9999999999, 9999999999],
      Contents: PDFHexString.of('0'.repeat(CERTIFICAT_TAILLE_SIGNATURE * 2)),
      M: PDFString.fromDate(date), Name: PDFHexString.fromText(resume.sujet),
    }));
    const sigDict = ctx.lookup(sig);
    if (o.raison) sigDict.set(PDFName.of('Reason'), PDFHexString.fromText(o.raison));
    if (o.lieu) sigDict.set(PDFName.of('Location'), PDFHexString.fromText(o.lieu));

    // Le champ de signature : invisible, ou un cartouche dans un coin de la page choisie.
    const v = o.visible;
    const page = pages[v ? Math.min(Math.max(v.page || pages.length, 1), pages.length) - 1 : 0];
    let rect = [0, 0, 0, 0], ap = null;
    if (v) {
      const b = page.getMediaBox();
      const W = b.width, H = b.height, ox = b.x, oy = b.y;
      const angle = ((page.getRotation().angle % 360) + 360) % 360;
      const wd = v.largeur || 200, hd = v.hauteur || 58, marge = 24;
      const Wd = angle % 180 ? H : W, Hd = angle % 180 ? W : H;
      const xd = v.coin.indexOf('gauche') >= 0 ? marge : Wd - wd - marge;
      const yd = v.coin.indexOf('haut') >= 0 ? Hd - hd - marge : marge;
      // Le cartouche se pose dans la page telle qu'on la voit ; le fichier la décrit non pivotée.
      if (angle === 0) rect = [xd, yd, xd + wd, yd + hd];
      else if (angle === 90) rect = [W - (yd + hd), xd, W - yd, xd + wd];
      else if (angle === 180) rect = [W - (xd + wd), H - (yd + hd), W - xd, H - yd];
      else rect = [yd, H - (xd + wd), yd + hd, H - xd];
      rect = [rect[0] + ox, rect[1] + oy, rect[2] + ox, rect[3] + oy];
      const police = await doc.embedFont(StandardFonts.Helvetica);
      const gras = await doc.embedFont(StandardFonts.HelveticaBold);
      const lignes = cartoucheSignature(resume, { date, raison: o.raison, lieu: o.lieu });
      let contenu = 'q 0.96 0.97 1 rg 0 0 ' + wd + ' ' + hd + ' re f 0.15 0.39 0.79 RG 1 w 0.5 0.5 ' + (wd - 1) + ' ' + (hd - 1) + ' re S Q\nBT 0.08 0.09 0.11 rg\n';
      let y = hd - 12;
      lignes.forEach((t, i) => {
        // les deux premières lignes en gras (« Signé numériquement par » et le nom)
        contenu += '/' + (i === 1 ? 'G' : 'P') + ' 8 Tf 1 0 0 1 6 ' + y + ' Tm (' + echapperPdf(t.length > 46 ? t.slice(0, 45) + '…' : t) + ') Tj\n';
        y -= 10;
      });
      contenu += 'ET';
      const M = { 0: [1, 0, 0, 1, 0, 0], 90: [0, 1, -1, 0, 0, 0], 180: [-1, 0, 0, -1, 0, 0], 270: [0, -1, 1, 0, 0, 0] }[angle];
      const flux = octetsDe(contenu.replace(/…/g, '.').replace(/[^\x00-\xff]/g, '?'));
      ap = ctx.register(ctx.stream(flux, { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, wd, hd], Matrix: M, Resources: { Font: { P: police.ref, G: gras.ref } } }));
    }
    const noms = new Set();
    try { doc.getForm().getFields().forEach(f => noms.add(f.getName())); } catch (e) { /* un formulaire illisible n'empêche pas de signer */ }
    let nomChamp = 'Signature1';
    for (let i = 2; noms.has(nomChamp); i++) nomChamp = 'Signature' + i;
    const widget = ctx.obj({ Type: 'Annot', Subtype: 'Widget', FT: 'Sig', T: PDFString.of(nomChamp), V: sig, Rect: rect, F: 132, P: page.ref });
    if (ap) widget.set(PDFName.of('AP'), ctx.obj({ N: ap }));
    const widgetRef = ctx.register(widget);
    page.node.addAnnot(widgetRef);
    let form = doc.catalog.lookup(PDFName.of('AcroForm'));
    if (!(form instanceof PDFDict)) { form = ctx.obj({ Fields: [] }); doc.catalog.set(PDFName.of('AcroForm'), form); }
    let champs = form.lookup(PDFName.of('Fields'));
    if (!(champs instanceof PDFArray)) { champs = ctx.obj([]); form.set(PDFName.of('Fields'), champs); }
    champs.push(widgetRef);
    form.set(PDFName.of('SigFlags'), PDFNumber.of(3));

    // Sans flux d'objets : la valeur de la signature reste lisible dans le fichier, à une place que l'on retrouve.
    const brut = await doc.save({ useObjectStreams: false });
    const texte = new TextDecoder('latin1').decode(brut);
    // pdf-lib écrit « [ 0 9999999999 … ] » : on retrouve les deux marques sans compter sur la mise en forme.
    const mBR = /\/ByteRange\s*\[\s*0\s+9999999999\s+9999999999\s+9999999999\s*\]/.exec(texte);
    const mCt = new RegExp('/Contents\\s*<0{' + CERTIFICAT_TAILLE_SIGNATURE * 2 + '}>').exec(texte);
    if (!mBR || !mCt) throw new Error('La zone de signature n\'a pas été retrouvée dans le fichier.');
    const iBR = mBR.index;
    const debutHex = mCt.index + mCt[0].indexOf('<');                    // le « < »
    const finHex = debutHex + 1 + CERTIFICAT_TAILLE_SIGNATURE * 2 + 1;   // après le « > »
    const plage = [0, debutHex, finHex, brut.length - finHex];
    // Les mêmes octets, plage comprise : on réécrit sur place, complété d'espaces.
    let br = '/ByteRange [' + plage.join(' ') + ']';
    if (br.length > mBR[0].length) throw new Error('Plage d\'octets trop longue.');
    br += ' '.repeat(mBR[0].length - br.length);
    brut.set(octetsDe(br), iBR);

    // Ce qui est signé : tout, sauf la valeur de la signature.
    const donnees = new Uint8Array(plage[1] + plage[3]);
    donnees.set(brut.subarray(0, plage[1]), 0);
    donnees.set(brut.subarray(plage[2]), plage[1]);
    const p7 = F.pkcs7.createSignedData();
    p7.content = F.util.createBuffer(binaireDe(donnees));
    [o.certificat.certificat].concat(o.certificat.chaine).forEach(c => p7.addCertificate(c));
    p7.addSigner({
      key: o.certificat.cle, certificate: o.certificat.certificat, digestAlgorithm: F.pki.oids.sha256,
      authenticatedAttributes: [
        { type: F.pki.oids.contentType, value: F.pki.oids.data },
        { type: F.pki.oids.messageDigest },
        { type: F.pki.oids.signingTime, value: date },
      ],
    });
    p7.sign({ detached: true });
    const cms = octetsDe(F.asn1.toDer(p7.toAsn1()).getBytes());
    if (cms.length > CERTIFICAT_TAILLE_SIGNATURE) throw new Error('La signature (avec la chaîne de certificats) est trop volumineuse pour la zone réservée.');
    const hex = Array.from(cms, b => b.toString(16).padStart(2, '0')).join('');
    brut.set(octetsDe(hex), debutHex + 1);
    return brut;
  }
  // @fin-certificat

  async function toolCertificat() {
    if (!state.pages.length) { toast('Aucune page à signer.', 'warn'); return; }
    if (state.busy) return;
    if (!FEAT.certificat) {
      dialog({ title: 'Signer avec un certificat', icon: IC.lock, build: b => b.append(note('Cette copie du logiciel n\'embarque pas le composant de signature. Utilisez la version portable (le fichier Aktum PDF hors ligne).', 'warn')) });
      return;
    }
    if (state.security) {
      dialog({ title: 'Signer avec un certificat', icon: IC.lock, build: b => b.append(note('Ce document est protégé par un mot de passe : ce logiciel ne signe pas un document chiffré. Retirez d\'abord la protection (outil « Mot de passe »).', 'warn')) });
      return;
    }
    let fichier = null, lu = null;
    const inp = document.createElement('input');
    inp.type = 'file'; inp.id = 'cert-fichier'; inp.className = 'sr-only'; inp.tabIndex = -1; inp.accept = '.p12,.pfx,application/x-pkcs12';
    const choisir = document.createElement('button');
    choisir.type = 'button'; choisir.className = 'tb-btn'; choisir.style.border = '1px solid var(--trait)';
    choisir.textContent = 'Choisir le certificat (.p12, .pfx)…';
    choisir.addEventListener('click', () => { inp.value = ''; inp.click(); });
    const infoFichier = note('Aucun certificat choisi.');
    const mdp = input('cert-mdp', 'password', '');
    mdp.autocomplete = 'off';
    const lire = document.createElement('button');
    lire.type = 'button'; lire.className = 'tb-btn'; lire.id = 'cert-lire'; lire.textContent = 'Lire le certificat';
    const infoCert = note('');
    const raison = input('cert-raison', 'text', '');
    const lieu = input('cert-lieu', 'text', '');
    const visible = checkbox('cert-visible', 'Poser un cartouche de signature visible', true);
    const page = input('cert-page', 'number', state.pages.length, { min: 1, max: state.pages.length });
    const coin = select('cert-coin', [['bas-droite', 'Bas, à droite'], ['bas-gauche', 'Bas, à gauche'], ['haut-droite', 'Haut, à droite'], ['haut-gauche', 'Haut, à gauche']], 'bas-droite');
    const zoneVisible = rowOf([field('Page', page), field('Coin', coin)], true);
    visible.input.addEventListener('change', () => { zoneVisible.hidden = !visible.input.checked; });
    let bouton = null;
    const majBouton = () => { if (bouton) bouton.disabled = !lu || lu.resume.pasEncoreValide || lu.resume.expire; };
    inp.addEventListener('change', () => {
      fichier = inp.files && inp.files[0] || null; lu = null;
      infoFichier.textContent = fichier ? fichier.name : 'Aucun certificat choisi.';
      infoCert.textContent = ''; infoCert.classList.remove('warn'); majBouton();
    });
    lire.addEventListener('click', async () => {
      if (!fichier) { toast('Choisissez d\'abord le fichier du certificat.', 'warn'); return; }
      lu = null; majBouton();
      try {
        lu = certificatLire(new Uint8Array(await fichier.arrayBuffer()), mdp.value);
        const r = lu.resume;
        const d = x => x.toLocaleDateString(regionLocale());
        let t = 'Certificat de « ' + r.sujet + ' »' + (r.organisation ? ' (' + r.organisation + ')' : '') + ', délivré par « ' + r.emetteur + ' », valable du ' + d(r.du) + ' au ' + d(r.au) + '.';
        let avert = false;
        if (r.expire) { t += ' Il a expiré : il ne peut pas servir à signer.'; avert = true; }
        else if (r.pasEncoreValide) { t += ' Il n\'est pas encore valable.'; avert = true; }
        if (r.autoSigne) { t += ' Il est auto-signé : aucune autorité n\'en répond.'; avert = true; }
        infoCert.textContent = t; infoCert.classList.toggle('warn', avert);
      } catch (e) { infoCert.textContent = e.message; infoCert.classList.add('warn'); }
      majBouton();
    });
    dialog({
      title: 'Signer avec un certificat', icon: IC.lock, wide: true, submitOnEnter: false,
      build: b => {
        b.append(note('Signe le document avec le certificat personnel que vous a remis un prestataire (fichier .p12 ou .pfx). Le certificat est lu sur ce poste, sa clé n\'en sort jamais et n\'est pas gardée ; le mot de passe est redemandé à chaque signature.'));
        b.append(rowOf([choisir, infoFichier], true));
        b.append(inp);
        b.append(rowOf([field('Mot de passe du certificat', mdp), lire], true));
        b.append(infoCert);
        b.append(rowOf([field('Motif (facultatif)', raison), field('Lieu (facultatif)', lieu)], true));
        b.append(visible);
        b.append(zoneVisible);
        b.append(note('La signature prouve que le document n\'a pas changé depuis, et qu\'elle a été faite avec la clé de ce certificat. Sa valeur juridique dépend du certificat (un certificat qualifié d\'un prestataire reconnu n\'a pas la même portée qu\'un autre), pas de ce logiciel. La date est celle de l\'horloge de ce poste : il n\'y a pas d\'horodatage d\'une autorité de temps. Une fois signé, tout changement du fichier se voit.'));
      },
      actions: [
        { label: 'Annuler', onClick: c => c() },
        { id: 'cert-signer', label: 'Signer et enregistrer', primary: true, onClick: close => {
          if (!lu) { toast('Lisez d\'abord le certificat (mot de passe, puis « Lire le certificat »).', 'warn'); return; }
          const options = { certificat: lu, raison: raison.value.trim(), lieu: lieu.value.trim(), visible: visible.input.checked ? { page: clampInt(page.value, 1, state.pages.length) || state.pages.length, coin: coin.value } : null };
          mdp.value = '';
          close();
          signerEtEnregistrer(options);
        } },
      ],
    });
    bouton = $('#cert-signer');
    majBouton();
  }

  async function signerEtEnregistrer(options) {
    if (state.busy) return;
    if (essaiFiniRefuse()) return;
    const pages = state.pages;
    if (!(await pertesAcceptees(pages, {}))) { setLast('Signature annulée'); return; }
    setBusy('Assemblage avant signature…', 0, { annuler: true });
    try {
      const octets = await buildPdf(pages, { onProgress: (r, t) => { verifierAnnulation(); setBusy(t || 'Assemblage…', r, { annuler: true }); } });
      if (!(await caracteresAcceptes())) { setLast('Signature annulée'); return; }
      setBusy('Signature…', 1);
      await nextFrame();
      const signe = await signerPdf(octets, Object.assign({ date: new Date() }, options));
      // Le fichier est relu et contrôlé avant d'être livré : une signature qui ne se vérifie pas ne part pas.
      const rapport = await verifierLesSignatures(signe);
      const dernier = rapport[rapport.length - 1];
      if (!dernier || dernier.etat !== 'intacte') throw new Error('La signature produite ne se vérifie pas (' + (dernier && dernier.raison ? dernier.raison : 'raison inconnue') + ') : le fichier n\'est pas enregistré.');
      setBusy('');
      const nom = safeBase(baseName(el.filename.value)).replace(SUFFIXE_MODIFIE, '') + tr('-signe.pdf');
      const parti = await deliver(signe, nom, null, {});
      if (parti) setLast('Signé par ' + options.certificat.resume.sujet + ' : ' + nom);
    } catch (e) {
      if (e && e.annule) { setLast('Signature annulée'); toast('Signature annulée.', 'warn'); return; }
      signaler('Signature avec un certificat', e, 'erreur');
      toast(messageDEchec('La signature', e), 'error');
    } finally { setBusy(''); }
  }
