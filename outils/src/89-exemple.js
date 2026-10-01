  // =====================================================================
  //  Le document d'exemple, et la visite guidée qui s'y appuie
  //  -------------------------------------------------------------------
  //  Les vingt premières minutes décident de l'impression : un exemple de vente (« Couverture, Offre, Conditions ») ne
  //  montre rien de ce qu'on fait ici. Celui-ci est un dossier de commune imaginaire — un préavis, un tableau, un
  //  formulaire à remplir, un courrier numérisé, un procès-verbal, une page à signer —, de quoi essayer chaque geste
  //  sur du vrai texte : chercher, corriger, caviarder un nom, remplir, reconnaître un scan, signer. Aucun nom, aucun
  //  numéro n'est réel : « Exemple » est le nom de tout ce qui s'y trouve.
  //  La visite (Aide › Découvrir Aktum PDF en 5 minutes) guide quatre gestes sur ce document, dans une petite carte qui ne
  //  bloque rien : on peut continuer à travailler, et elle attend.
  // =====================================================================

  // Un générateur pseudo-aléatoire à graine : le « scan » est le même à chaque ouverture.
  function graineAleatoire(graine) {
    let s = graine >>> 0;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }

  // Une lettre « reçue », en image : du papier un peu jauni, une frappe à la machine, un léger faux-plomb, de travers de quelques
  // dixièmes de degré. Aucun texte dans le PDF — c'est ce que « Reconnaître le texte » est fait pour lire.
  async function dessinerUnCourrierNumerise() {
    const W = 1000, H = 1414;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    x.fillStyle = '#f3f0e8'; x.fillRect(0, 0, W, H);
    x.save();
    x.translate(W / 2, H / 2); x.rotate(0.007); x.translate(-W / 2, -H / 2);
    x.fillStyle = '#2a2a2a';
    x.textBaseline = 'alphabetic';
    const lignes = [
      ['bold', tr('Commune d\'Exemple')], ['', tr('Service des travaux')], ['', ''],
      ['', tr('Madame Claire Exemple')], ['', tr('Rue de la Gare 1')], ['', tr('1000 Exemple-sur-Lac')], ['', ''], ['', ''],
      ['bold', tr('Objet : demande d\'autorisation de construire')], ['', ''],
      ['', tr('Madame,')], ['', ''],
      ['', tr('Nous avons bien reçu votre demande du 3 mars 2026 concernant')],
      ['', tr('la construction d\'un garage de 36 m² sur la parcelle n° 1234.')], ['', ''],
      ['', tr('Le dossier est complet. Il sera mis à l\'enquête publique')],
      ['', tr('pendant trente jours, dès sa publication dans la Feuille')],
      ['', tr('des avis officiels. Les oppositions éventuelles doivent')],
      ['', tr('nous parvenir par écrit avant la fin de ce délai.')], ['', ''],
      ['', tr('Nous restons à votre disposition pour tout renseignement.')], ['', ''],
      ['', tr('Veuillez agréer, Madame, nos salutations distinguées.')], ['', ''], ['', ''],
      ['', tr('Le chef du service des travaux')],
    ];
    lignes.forEach(([graisse, texte], i) => {
      if (!texte) return;
      x.font = (graisse ? 'bold ' : '') + '24px "Courier New", Courier, monospace';
      x.fillText(texte, 90, 170 + i * 38);
    });
    x.restore();
    // le grain du scanner, et un bord un peu plus sombre
    const alea = graineAleatoire(2026);
    const img = x.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (alea() - 0.5) * 22;
      d[i] = Math.max(0, Math.min(255, d[i] + n)); d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n)); d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    x.putImageData(img, 0, 0);
    const bord = x.createLinearGradient(0, 0, 70, 0);
    bord.addColorStop(0, 'rgba(0,0,0,.10)'); bord.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = bord; x.fillRect(0, 0, 70, H);
    const octets = await new Promise((ok, ko) => cv.toBlob(b => (b ? b.arrayBuffer().then(ok, ko) : ko(new Error('image du scan'))), 'image/jpeg', 0.8));
    return new Uint8Array(octets);
  }

  // Le document, six pages : de quoi tout essayer.
  async function makeSample() {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const doc = await PDFDocument.create();
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const reg = await doc.embedFont(StandardFonts.Helvetica);
    const W = 595.28, H = 841.89, MARGE = 56;
    const encre = rgb(0.08, 0.09, 0.11), gris = rgb(0.36, 0.39, 0.45), bleu = rgb(0.15, 0.39, 0.79);
    const t = s => winAnsi(tr(s));
    // Une page : bandeau, titre, texte posé ligne à ligne ; pied de page.
    const page = (titre, sous) => {
      const p = doc.addPage([W, H]);
      p.drawText(t('Commune d\'Exemple'), { x: MARGE, y: H - 52, size: 10, font: bold, color: bleu });
      p.drawText(t('Document d\'exemple — personnes et chiffres imaginaires'), { x: W - MARGE - 270, y: H - 52, size: 8, font: reg, color: gris });
      p.drawRectangle({ x: MARGE, y: H - 62, width: W - 2 * MARGE, height: 1.5, color: bleu });
      p.drawText(t(titre), { x: MARGE, y: H - 100, size: 19, font: bold, color: encre });
      if (sous) p.drawText(t(sous), { x: MARGE, y: H - 120, size: 10.5, font: reg, color: gris });
      return p;
    };
    const paragraphe = (p, texte, x, y, largeur, opts) => {
      const o = Object.assign({ size: 11, font: reg, color: encre, interligne: 16 }, opts || {});
      const mots = t(texte).split(' ');
      let ligne = '';
      mots.forEach(m => {
        const essai = ligne ? ligne + ' ' + m : m;
        if (o.font.widthOfTextAtSize(essai, o.size) > largeur && ligne) { p.drawText(ligne, { x, y, size: o.size, font: o.font, color: o.color }); y -= o.interligne; ligne = m; }
        else ligne = essai;
      });
      if (ligne) { p.drawText(ligne, { x, y, size: o.size, font: o.font, color: o.color }); y -= o.interligne; }
      return y;
    };
    const L = W - 2 * MARGE;

    // 1. Un préavis : du texte, des chiffres, un nom et un numéro à caviarder
    let p = page('Préavis municipal n° 12/2026', 'Réfection de la salle polyvalente — séance du Conseil communal du 12 mars 2026');
    let y = H - 160;
    y = paragraphe(p, 'Madame la Présidente, Mesdames et Messieurs les Conseillers,', MARGE, y, L) - 8;
    y = paragraphe(p, 'La salle polyvalente, construite en 1974, ne répond plus aux normes de sécurité ni d\'isolation. La Municipalité vous propose un crédit d\'investissement de CHF 480 000 pour sa réfection complète : toiture, chauffage, électricité et accès pour personnes à mobilité réduite.', MARGE, y, L) - 8;
    y = paragraphe(p, 'Ce montant est inscrit au plan des investissements et n\'augmente pas le budget de fonctionnement de plus de CHF 18 000 par an, charges d\'intérêts et d\'amortissement comprises. Les travaux dureraient neuf mois ; la salle resterait accessible aux sociétés locales à partir de la rentrée.', MARGE, y, L) - 8;
    y = paragraphe(p, 'La commission des finances a examiné le budget détaillé (tableau 1, page suivante) et recommande son adoption.', MARGE, y, L) - 22;
    p.drawText(t('Pour tout renseignement'), { x: MARGE, y, size: 11, font: bold, color: encre }); y -= 18;
    p.drawText(t('Responsable du dossier : Madame Claire Exemple'), { x: MARGE, y, size: 11, font: reg, color: encre }); y -= 16;
    p.drawText(t('Téléphone : 021 000 00 00'), { x: MARGE, y, size: 11, font: reg, color: encre }); y -= 16;
    p.drawText(t('Courriel : claire.exemple@commune.example'), { x: MARGE, y, size: 11, font: reg, color: encre });
    p.drawText(t('Essayez : « Caviarder une zone » sur ce nom et ce numéro.'), { x: MARGE, y: 70, size: 9.5, font: reg, color: gris });

    // 2. Un tableau : colonnes repérables, copiables vers Excel
    p = page('Tableau 1 — Plan de financement', 'Réfection de la salle polyvalente, en francs suisses');
    const colonnes = [MARGE, MARGE + 230, MARGE + 340, W - MARGE];
    const lignes = [['Poste', 'Montant (CHF)', 'Part'], ['Gros œuvre et toiture', '210 000', '44 %'], ['Électricité', '95 000', '20 %'], ['Chauffage et ventilation', '120 000', '25 %'], ['Honoraires et divers', '55 000', '11 %'], ['Total', '480 000', '100 %']];
    const hauteur = 30, haut = H - 160;
    lignes.forEach((l, r) => {
      const yy = haut - r * hauteur;
      if (r === 0) p.drawRectangle({ x: colonnes[0], y: yy - 9, width: colonnes[3] - colonnes[0], height: hauteur - 2, color: rgb(0.88, 0.92, 0.98) });
      l.forEach((c, k) => {
        const f = (r === 0 || r === lignes.length - 1) ? bold : reg;
        const texte = t(c), larg = f.widthOfTextAtSize(texte, 11);
        const px = k === 0 ? colonnes[k] + 8 : colonnes[k + 1] - 10 - larg;
        p.drawText(texte, { x: px, y: yy, size: 11, font: f, color: encre });
      });
    });
    for (let r = 0; r <= lignes.length; r++) p.drawLine({ start: { x: colonnes[0], y: haut + 20 - r * hauteur }, end: { x: colonnes[3], y: haut + 20 - r * hauteur }, thickness: 0.8, color: rgb(0.3, 0.3, 0.3) });
    colonnes.forEach(cx => p.drawLine({ start: { x: cx, y: haut + 20 }, end: { x: cx, y: haut + 20 - lignes.length * hauteur }, thickness: 0.8, color: rgb(0.3, 0.3, 0.3) }));
    paragraphe(p, 'Essayez : « Copier un tableau » (menu Outils) puis collez dans Excel : les colonnes sont repérées, les montants collés comme des nombres.', MARGE, 70, L, { size: 9.5, color: gris, interligne: 13 });

    // 3. Un formulaire : des champs à remplir, dans le PDF lui-même
    p = page('Demande de réservation de salle', 'À remplir à l\'écran, puis à enregistrer ou à imprimer');
    const form = doc.getForm();
    const champ = (etiquette, nom, yy, largeur) => {
      p.drawText(t(etiquette), { x: MARGE, y: yy + 5, size: 10.5, font: reg, color: encre });
      const f = form.createTextField(nom);
      f.addToPage(p, { x: MARGE + 150, y: yy - 4, width: largeur || 300, height: 22, borderColor: rgb(0.45, 0.48, 0.54), borderWidth: 1, font: reg });
    };
    champ('Nom et prénom', 'nom', H - 170);
    champ('Association ou société', 'association', H - 205);
    champ('Date souhaitée', 'date', H - 240, 140);
    champ('Nombre de personnes', 'personnes', H - 275, 90);
    p.drawText(t('Salle souhaitée'), { x: MARGE, y: H - 307, size: 10.5, font: reg, color: encre });
    const salle = form.createDropdown('salle');
    salle.addOptions([t('Grande salle'), t('Petite salle'), t('Salle du conseil')]);
    salle.addToPage(p, { x: MARGE + 150, y: H - 316, width: 200, height: 22, borderColor: rgb(0.45, 0.48, 0.54), borderWidth: 1, font: reg });
    p.drawText(t('Matériel nécessaire'), { x: MARGE, y: H - 345, size: 10.5, font: bold, color: encre });
    [['Projecteur', 'projecteur'], ['Sonorisation', 'sono'], ['Cuisine', 'cuisine']].forEach(([nomAffiche, nom], i) => {
      const yy = H - 372 - i * 28;
      const c = form.createCheckBox(nom);
      c.addToPage(p, { x: MARGE + 150, y: yy - 3, width: 16, height: 16, borderColor: rgb(0.45, 0.48, 0.54), borderWidth: 1 });
      p.drawText(t(nomAffiche), { x: MARGE + 176, y: yy, size: 10.5, font: reg, color: encre });
    });
    paragraphe(p, 'Essayez : l\'outil « Remplir le formulaire » (menu Outils) liste les champs ; ou cliquez directement dans la page.', MARGE, 70, L, { size: 9.5, color: gris, interligne: 13 });

    // 4. Un courrier numérisé : une image, pas de texte
    p = doc.addPage([W, H]);
    p.drawImage(await doc.embedJpg(await dessinerUnCourrierNumerise()), { x: 0, y: 0, width: W, height: H });

    // 5. Un procès-verbal : encore du texte, pour chercher et corriger
    p = page('Procès-verbal de la séance du 12 mars 2026', 'Conseil communal d\'Exemple — extrait');
    y = H - 160;
    [
      ['1.', 'Approbation de l\'ordre du jour. L\'ordre du jour est approuvé à l\'unanimité.'],
      ['2.', 'Préavis n° 12/2026. Après discussion, le Conseil adopte le crédit de CHF 480 000 par 62 voix contre 9 et 4 abstentions. Le budget est donc adopté tel que présenté.'],
      ['3.', 'Budget 2027. La commission des finances rappelle que le budget de fonctionnement devra être présenté avant le 30 septembre.'],
      ['4.', 'Divers. Monsieur Marc Exemple demande l\'état d\'avancement du budget d\'entretien des chemins communaux ; la Municipalité y répondra par écrit.'],
    ].forEach(([n, texte]) => {
      p.drawText(t(n), { x: MARGE, y, size: 11, font: bold, color: encre });
      y = paragraphe(p, texte, MARGE + 24, y, L - 24) - 10;
    });
    paragraphe(p, 'Essayez : Ctrl+F, « budget » — toutes les occurrences sont surlignées ; « Remplacer partout » corrige tout le document d\'un coup.', MARGE, 70, L, { size: 9.5, color: gris, interligne: 13 });

    // 6. Une page à signer
    p = page('Décision et signature', 'Extrait certifié conforme');
    y = H - 160;
    y = paragraphe(p, 'Le Conseil communal décide d\'adopter le préavis n° 12/2026 et d\'accorder à la Municipalité le crédit demandé de CHF 480 000, à prélever sur les liquidités courantes.', MARGE, y, L) - 40;
    p.drawText(t('Exemple-sur-Lac, le 12 mars 2026'), { x: MARGE, y, size: 11, font: reg, color: encre }); y -= 70;
    p.drawText(t('Le syndic'), { x: MARGE, y: y + 40, size: 11, font: bold, color: encre });
    p.drawLine({ start: { x: MARGE, y }, end: { x: MARGE + 200, y }, thickness: 0.8, color: rgb(0.3, 0.3, 0.3) });
    p.drawText(t('La secrétaire'), { x: MARGE + 260, y: y + 40, size: 11, font: bold, color: encre });
    p.drawLine({ start: { x: MARGE + 260, y }, end: { x: MARGE + 460, y }, thickness: 0.8, color: rgb(0.3, 0.3, 0.3) });
    paragraphe(p, 'Essayez : « Signer » (menu Outils) pour tracer une signature, ou « Tampon » pour poser « Reçu le » avec la date du jour.', MARGE, 70, L, { size: 9.5, color: gris, interligne: 13 });

    return doc.save();
  }
  async function loadSample() {
    if (state.sources.some(s => s.isSample)) return;
    try {
      setBusy('Préparation de l\'exemple…');
      const bytes = await makeSample();
      await addPdfSource('exemple.pdf', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), { isSample: true, silent: true });
      state.history = []; state.redo = [];
      vue.render();
      setLast('Exemple chargé : déplacez une page, annotez-la, ou ouvrez vos propres documents.');
    } catch (e) { console.error(e); toast('L\'exemple n\'a pas pu être créé.', 'error'); }
    finally { setBusy(''); }
  }

  // =====================================================================
  //  La visite : quatre gestes, une petite carte
  // =====================================================================
  // Chaque étape dit ce qu'on va faire, le montre (un clic sur ce que la personne ferait) et attend. La carte ne bloque rien : une
  // fenêtre s'ouvre par-dessus, on travaille, et la carte est toujours là à la fermeture. Elle ne retient rien et n'écrit rien.
  const VISITE = [
    { titre: 'Chercher dans le document',
      texte: 'Le document d\'exemple est un dossier de commune imaginaire. Cherchez-y le mot « budget » : chaque occurrence est surlignée sur les pages, Entrée passe à la suivante.',
      bouton: 'Chercher « budget »',
      agit: () => {
        const b = $('#btn-search'); if (b && !b.disabled) b.click();
        setTimeout(() => { const q = $('#se-q'); if (q) { q.value = 'budget'; q.dispatchEvent(new Event('input', { bubbles: true })); q.focus(); } }, 350);
      } },
    { titre: 'Réorganiser les pages',
      texte: 'Passez en vue Organiser : glissez une page ailleurs, ou sélectionnez-la et faites-la pivoter. Ctrl+Z défait chaque geste ; rien n\'est écrit tant que vous n\'exportez pas.',
      bouton: 'Passer en vue Organiser',
      agit: () => { const b = $('.vue-mode[data-vue="organiser"]'); if (b) b.click(); } },
    { titre: 'Caviarder un nom',
      texte: 'La première page porte un nom et un numéro de téléphone imaginaires. « Caviarder une zone » les retire pour de bon du fichier : le texte lui-même disparaît, pas seulement sous un rectangle noir.',
      bouton: 'Ouvrir « Caviarder une zone »',
      agit: () => {
        const l = $('.vue-mode[data-vue="lecture"]'); if (l && l.getAttribute('aria-pressed') !== 'true') l.click();
        const o = $('#tab-tools'); if (o) o.click();
        setTimeout(() => { const c = $('[data-tool="caviarder-zone"]'); if (c && !c.disabled) c.click(); }, 250);
      } },
    { titre: 'Imprimer ou exporter',
      texte: 'Pour finir, imprimez en recto verso ou en livret (Ctrl+P), ou exportez le résultat en PDF (Ctrl+S). Tout se fait sur ce poste : aucun document ne part nulle part.',
      bouton: 'Ouvrir l\'impression',
      agit: () => { const b = $('#btn-print'); if (b && !b.disabled) b.click(); } },
  ];
  let visite = null;   // { etape, carte }

  function visiteFermer() {
    if (!visite) return;
    visite.carte.remove();
    const retour = visite.retour;
    visite = null;
    try { if (retour && retour.focus && document.contains(retour)) retour.focus(); } catch (e) { signaler('Visite guidée', e, 'info'); }
  }
  function visiteAfficher(n) {
    if (!visite) return;
    visite.etape = n;
    const c = visite.carte;
    c.replaceChildren();
    const fin = n >= VISITE.length;
    const tete = document.createElement('div'); tete.className = 'dec-tete';
    const h = document.createElement('h2'); h.className = 'dec-titre';
    h.textContent = fin ? tr('C\'est tout') : tr(VISITE[n].titre);
    const compteur = document.createElement('span'); compteur.className = 'dec-compte';
    compteur.textContent = fin ? '' : tr('Étape {0} sur {1}').replace('{0}', String(n + 1)).replace('{1}', String(VISITE.length));
    const x = document.createElement('button'); x.type = 'button'; x.className = 'dec-x'; x.title = tr('Quitter la visite'); x.setAttribute('aria-label', tr('Quitter la visite'));
    x.appendChild(icon(IC.x, { sw: 1.8 }));
    x.addEventListener('click', visiteFermer);
    tete.append(h, compteur, x);
    const texte = document.createElement('p'); texte.className = 'dec-texte';
    texte.textContent = fin ? tr('Vous avez vu l\'essentiel : chercher, réorganiser, caviarder, imprimer. Le menu Outils porte tous les autres outils, et « ? » liste tous les raccourcis. Remplacez l\'exemple par vos documents quand vous voulez : ouvrez-les, il s\'efface.') : tr(VISITE[n].texte);
    c.append(tete, texte);
    const rang = document.createElement('div'); rang.className = 'dec-actions';
    if (!fin) {
      const montrer = document.createElement('button'); montrer.type = 'button'; montrer.className = 'tb-btn primary'; montrer.textContent = tr(VISITE[n].bouton);
      montrer.addEventListener('click', () => { try { VISITE[n].agit(); } catch (e) { signaler('Visite guidée', e); } });
      const suite = document.createElement('button'); suite.type = 'button'; suite.className = 'tb-btn';
      suite.textContent = n === VISITE.length - 1 ? tr('Terminer') : tr('Étape suivante');
      suite.addEventListener('click', () => visiteAfficher(n + 1));
      rang.append(montrer, suite);
    } else {
      const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'tb-btn primary'; ok.textContent = tr('Fermer la visite');
      ok.addEventListener('click', visiteFermer);
      rang.append(ok);
    }
    c.appendChild(rang);
    // l'étape suivante s'annonce à qui lit à l'oreille
    c.setAttribute('aria-label', fin ? tr('Visite guidée : fin') : tr('Visite guidée') + ' — ' + tr('Étape {0} sur {1}').replace('{0}', String(n + 1)).replace('{1}', String(VISITE.length)));
  }
  // Ouvre l'exemple s'il n'est pas déjà là (dans un nouvel onglet quand un vrai document est ouvert), puis la carte.
  async function decouvrir() {
    if (visite) { visiteFermer(); }
    if (!state.sources.some(s => s.isSample)) {
      if (state.sources.some(s => !s.isSample)) nouvelOnglet();
      await loadSample();
    }
    const l = $('.vue-mode[data-vue="lecture"]'); if (l && l.getAttribute('aria-pressed') !== 'true') l.click();
    const carte = document.createElement('section');
    carte.className = 'decouverte'; carte.setAttribute('role', 'region'); carte.setAttribute('aria-live', 'polite');
    document.body.appendChild(carte);
    visite = { etape: 0, carte, retour: document.activeElement };
    visiteAfficher(0);
    const premier = $('.dec-actions .tb-btn', carte); if (premier) premier.focus();
  }
