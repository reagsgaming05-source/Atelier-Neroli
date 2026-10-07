  // =====================================================================
  //  Icons
  // =====================================================================
  const SVGNS = 'http://www.w3.org/2000/svg';
  // Un seul jeu d'icônes : une grille de 16, un trait de 1,5, bouts et jointures arrondis, des rectangles aux coins
  // vifs (les jointures les arrondissent d'un demi-trait). Les dessins de la page (src/page.html) n'existent pas
  // ailleurs : leur emplacement y est un repère « ic:nom » entre commentaires HTML, que l'assembleur remplace par le dessin d'ici, de sorte
  // qu'une icône ne s'écrit qu'une fois. L'épaisseur (`sw`) ne se change que pour garder le même trait optique à
  // une taille réduite (la croix des petits boutons de fermeture), jamais pour « alourdir » une icône.
  // Elle est décorative : le nom d'un bouton vient de son libellé, pas de son dessin.
  function icon(d, extra) {
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    s.setAttribute('viewBox', '0 0 16 16');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', (extra && extra.sw) || '1.5');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    (Array.isArray(d) ? d : [d]).forEach(p => {
      const el = document.createElementNS(SVGNS, p.charAt(0) === 'C' ? 'circle' : 'path');
      if (p.charAt(0) === 'C') { const a = p.slice(1).split(','); el.setAttribute('cx', a[0]); el.setAttribute('cy', a[1]); el.setAttribute('r', a[2]); }
      else el.setAttribute('d', p);
      s.appendChild(el);
    });
    return s;
  }
  const IC = {
    rotL: ['M3.5 6.5A5 5 0 1 1 3 9', 'M3 3v3.5h3.5'],
    rotR: ['M12.5 6.5A5 5 0 1 0 13 9', 'M13 3v3.5H9.5'],
    left: 'm10 3-5 5 5 5',
    right: 'm6 3 5 5-5 5',
    hash: ['M6 2.5 4.5 13.5M11.5 2.5 10 13.5M2.5 6h11M2 10h11'],
    pencil: ['M11.5 2.5 13.5 4.5 5.5 12.5 2.5 13.5 3.5 10.5z'],
    trash: ['M3 4.5h10', 'M6.5 4.5V3h3v1.5', 'M4.5 4.5 5 13h6l.5-8.5'],
    x: 'm4 4 8 8M12 4l-8 8',
    check: 'm3.5 8.5 3 3 6-7',
    plus: 'M8 3v10M3 8h10',
    doc: ['M9.5 1.5H4.5A1.5 1.5 0 0 0 3 3v10a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 13 13V5z', 'M9.5 1.5V5H13'],
    image: ['M2.5 3.5h11v9h-11z', 'M2.5 10.5 6 7l2.5 2.5L11 7l2.5 2.5', 'C5.5,6,1'],
    text: ['M4 4V2.8h8V4', 'M8 2.8v10.4', 'M6 13.2h4'],
    stamp: ['M4 13.5h8', 'M5.5 11.5h5l-.5-3a2.5 2.5 0 1 0-4 0z'],
    water: ['M8 2.5s4 4.5 4 7a4 4 0 0 1-8 0c0-2.5 4-7 4-7z'],
    header: ['M2.5 3.5h11', 'M2.5 12.5h11', 'M4.5 6.5h7M4.5 9h5'],
    lock: ['M3.5 7.5h9v6h-9z', 'M5.5 7.5V5a2.5 2.5 0 0 1 5 0v2.5'],
    txt: ['M4 2.5h5.5L12 5v8.5H4z', 'M9.5 2.5V5H12', 'M6 8h4M6 10.5h4'],
    zap: ['M8.5 2 4 9h3.5L7 14l4.5-7H8z'],
    resize: ['M2.5 2.5h11v11h-11z', 'M6 6h4v4H6z'],
    info: ['C8,8,6', 'M8 7.5v3.5', 'M8 5.2h.01'],
    search: ['C7,7,4.5', 'm10.5 10.5 3 3'],
    form: ['M2.5 3.5h11v9h-11z', 'M5 6.5h6M5 9.5h3'],
    champ: ['M2.5 4.5h11v7h-11z', 'M5.5 6.5v3', 'M4.5 6.5h2M4.5 9.5h2'],
    flat: ['M2.5 8 8 4.5 13.5 8 8 11.5z', 'M2.5 11 8 14l5.5-3'],
    sun: ['C8,8,3', 'M8 1.5v1.5M8 13v1.5M14.5 8H13M3 8H1.5M12.6 3.4l-1 1M4.4 11.6l-1 1M12.6 12.6l-1-1M4.4 4.4l-1-1'],
    moon: ['M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z'],
    auto: ['C8,8,6', 'M8 2a6 6 0 0 0 0 12z'],
    highlight: ['M3 13.5h10', 'M5 11 10.5 3l2.5 2L7.5 11z'],
    redact: ['M2.5 5.5h11v5h-11z'],
    draw: ['M2.5 12.5c2-6 4.5 2 6.5-2s3-4 4.5-5'],
    select: ['m3 2.5 9 5.5-4 1-1.5 4z'],
    box: ['M3 3.5h10v9H3z'],
    balai: ['M10 2.5 7 7.5', 'M5.2 8 9 10l-2.2 4.2L3 12.2z', 'M11.5 4.5 13 3'],
    rogner: ['M4.5 1.5v10a1 1 0 0 0 1 1h9', 'M1.5 4.5h10a1 1 0 0 1 1 1v9'],
    souligne: ['M5 3v5a3 3 0 0 0 6 0V3', 'M3 13.5h10'],
    barre: ['M3 8h10', 'M10.5 5c-.5-1-1.4-1.6-2.6-1.6-1.4 0-2.5.8-2.5 2 0 .9.6 1.4 1.6 1.8', 'M9.4 9c1 .4 1.7.9 1.7 1.9 0 1.2-1.2 2-2.8 2-1.3 0-2.3-.6-2.7-1.7'],
    note: ['M3 2.5h10v8l-3 3H3z', 'M10 13.5v-3h3', 'M5.5 5.5h5', 'M5.5 8h3'],
    fleche: ['M3 13 13 3', 'M7 3h6v6'],
    lien: ['M6.5 9.5l3-3', 'M7 4.8l.9-.9a2.5 2.5 0 0 1 3.5 3.5l-.9.9', 'M9 11.2l-.9.9a2.5 2.5 0 0 1-3.5-3.5l.9-.9'],
    save: ['M8 2v8', 'm4.5 6.5 3.5 3.5 3.5-3.5', 'M2.5 11v1.5A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V11'],
    print: ['M4.5 6V2.5h7V6', 'M3 6h10a1 1 0 0 1 1 1v4h-2.5', 'M3 11H1.5', 'M4.5 9.5h7v4h-7z'],
    vide: ['M3 2.5h7l3 3v8H3z', 'M10 2.5V5.5h3', 'M5.5 11.5h5'],
    editText: ['M2.5 5V3.5h7V5', 'M6 3.5v7M4.5 10.5h3', 'M9.5 13.5l4.5-4.5-1.5-1.5L8 12v1.5z'],
    signet: ['M4 2.5h8v11l-4-3-4 3z'],
    deux: ['M1.5 3h5.5v10H1.5z', 'M9 3h5.5v10H9z'],
    ouvrir: ['M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v6.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5z'],
    annuler: ['M6 3 3 6l3 3', 'M3 6h6.5a3.5 3.5 0 0 1 0 7H6'],
    retablir: ['m10 3 3 3-3 3', 'M13 6H6.5a3.5 3.5 0 0 0 0 7H10'],
    lire: ['M8 4v9', 'M8 4 3 5.2v8L8 12', 'M8 4l5 1.2v8L8 12'],
    toutSelect: ['M2.5 2.5h11v11h-11z', 'm5.5 8 2 2 3.5-4'],
    aide: ['C8,8,6', 'M6.3 6.2a1.8 1.8 0 1 1 2.3 1.9c-.4.2-.6.5-.6.9v.3', 'M8 11.6h.01'],
    outils: ['M10.8 2.6a3.5 3.5 0 0 0-4.6 4.3l-4 4a1.3 1.3 0 0 0 1.9 1.9l4-4a3.5 3.5 0 0 0 4.3-4.6L10.2 6 9 4.8z'],
    alerte: ['M8 2.5 14 13H2z', 'M8 6.5v3', 'M8 11.2h.01'],
    dupliquer: ['M5.5 5.5h8v8h-8z', 'M10.5 5.5v-2A1.5 1.5 0 0 0 9 2H4a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 4 10h1.5'],
    compare: ['M8 2v12', 'M2.5 4h4v8h-4z', 'M9.5 4h4v8h-4z', 'M4.5 7h0M11.5 9h0'],
    dossier: ['M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v6.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5z', 'M5 9.5h6'],
    grille: ['M2.5 2.5h4v4h-4z', 'M9.5 2.5h4v4h-4z', 'M2.5 9.5h4v4h-4z', 'M9.5 9.5h4v4h-4z'],
    tableau: ['M2.5 3.5h11v9h-11z', 'M2.5 6.5h11M2.5 9.5h11', 'M6 3.5v9M10 3.5v9'],
    voix: ['M2.5 6.5h2.5L8.5 3.5v9L5 9.5H2.5z', 'M10.8 6a2.8 2.8 0 0 1 0 4', 'M12.6 4.2a5.4 5.4 0 0 1 0 7.6'],
    ocr: ['M2.5 5.5v-2h2M11.5 3.5h2v2M13.5 10.5v2h-2M4.5 12.5h-2v-2', 'M5.5 8h5', 'M8 6v4'],
  };
