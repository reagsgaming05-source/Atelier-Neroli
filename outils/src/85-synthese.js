  // =====================================================================
  //  Synthèse des commentaires
  //  -------------------------------------------------------------------
  //  Une relecture à plusieurs laisse un document couvert de remarques : la synthèse les réunit en une liste — page, type, auteur, date,
  //  texte — qu'on envoie à qui doit les traiter (un PDF qui se lit, ou un CSV qu'Excel trie par auteur ou par page).
  // =====================================================================
  function lignesDeSynthese(cases) {
    const lignes = cases.map(x => ({
      page: pageIndex(x.pages[0].id) + 1, document: baseName(x.src.name), type: x.c.libelle, auteur: x.c.auteur || '', date: x.c.date || '',
      texte: (x.c.contenu || '').replace(/\r\n?/g, '\n').trim(), retire: x.cb.checked,
    }));
    return lignes.sort((a, b) => a.page - b.page || a.document.localeCompare(b.document));
  }
  // Un CSV pour Excel : séparateur point-virgule (celui d'Excel en français et en allemand), UTF-8 avec marque, guillemets doublés.
  function syntheseEnCsv(lignes) {
    const champ = v => { const s = String(v == null ? '' : v); return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const entete = ['Page', 'Document', 'Type', 'Auteur', 'Date', 'Commentaire', 'Retiré à l\'export'].map(h => champ(tr(h)));
    const corps = lignes.map(l => [l.page, l.document, tr(l.type), l.auteur, l.date, l.texte, l.retire ? tr('oui') : tr('non')].map(champ).join(';'));
    return '﻿' + [entete.join(';')].concat(corps).join('\r\n') + '\r\n';
  }
  // Un PDF qui se lit : un bloc par commentaire, rangés par page.
  async function syntheseEnPdf(lignes, titre) {
    return avecEcritureUnicode(true, async () => {
      const { PDFDocument, rgb } = PDFLib;
      const doc = await PDFDocument.create();
      const reg = await policeDeBase(doc, false), gras = await policeDeBase(doc, true);
      const W = 595.28, H = 841.89, marge = 56, largeur = W - 2 * marge;
      const gris = rgb(0.42, 0.45, 0.5), noir = rgb(0.08, 0.09, 0.11), bleu = rgb(0.15, 0.39, 0.79);
      let pg = null, y = 0;
      const nouvelle = () => { pg = doc.addPage([W, H]); y = H - marge; };
      nouvelle();
      pg.drawText(winAnsi(tr('Synthèse des commentaires')), { x: marge, y, size: 20, font: gras, color: noir }); y -= 22;
      pg.drawText(winAnsi(titre + ' · ' + plural(lignes.length, 'commentaire', 'commentaires') + ' · ' + todayStr()), { x: marge, y, size: 10, font: reg, color: gris }); y -= 26;
      const place = (hauteur) => { if (y - hauteur < marge) nouvelle(); };
      lignes.forEach(l => {
        const entete = [tr('p. ' + l.page), tr(l.type), l.auteur, l.date, l.retire ? tr('retiré à l\'export') : ''].filter(Boolean).join(' · ');
        const corps = l.texte ? l.texte.split('\n').flatMap(p => replierPdf(reg, p, 10, largeur - 14, 40)) : [];
        place(14 + corps.length * 13 + 10);
        pg.drawRectangle({ x: marge, y: y - 2 - corps.length * 13 - 2, width: 2.5, height: 14 + corps.length * 13, color: bleu });
        pg.drawText(couperTexte(gras, entete, 10, largeur - 14), { x: marge + 10, y: y - 10, size: 10, font: gras, color: noir });
        corps.forEach((ligne, i) => pg.drawText(ligne, { x: marge + 10, y: y - 10 - 13 * (i + 1), size: 10, font: reg, color: noir }));
        y -= 14 + corps.length * 13 + 12;
      });
      if (!lignes.length) pg.drawText(winAnsi(tr('Aucun commentaire dans ce document.')), { x: marge, y, size: 11, font: reg, color: gris });
      const octets = await doc.save();
      return octets;
    });
  }
  async function exporterSynthese(cases, format) {
    const lignes = lignesDeSynthese(cases);
    if (!lignes.length) { toast('Aucun commentaire à résumer.', 'warn'); return; }
    const base = safeBase(el.filename.value);
    try {
      if (format === 'csv') await deliver(syntheseEnCsv(lignes), base + tr('-commentaires.csv'), 'text/csv;charset=utf-8');
      else await deliver(await syntheseEnPdf(lignes, base), base + tr('-commentaires.pdf'), 'application/pdf');
      setLast(tr('Synthèse de {0} enregistrée').replace('{0}', plural(lignes.length, 'commentaire', 'commentaires')));
    } catch (e) { toast(messageDEchec('La synthèse des commentaires', e), 'error'); }
  }
  vue.syntheseCommentaires = exporterSynthese;
