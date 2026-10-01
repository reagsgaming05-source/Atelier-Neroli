  // =====================================================================
  //  La barre d'outils qui tient dans sa largeur
  // =====================================================================
  //
  // Elle se resserrait par paliers de largeur de fenêtre — 1460, 1320, 1080,
  // 960 px. Entre deux paliers, rien ne rattrapait : à 1500 px, qui est
  // justement la taille d'ouverture de la fenêtre, la barre mesurait 1596 px et
  // « Enregistrer » sortait de l'écran. Pire, elle tenait tant qu'aucun
  // document n'était ouvert, et débordait dès qu'on en ouvrait un : les
  // contrôles de zoom apparaissaient et poussaient le bouton dehors. Le bouton
  // le plus important disparaissait au moment précis où il devenait utile.
  //
  // On ne devine donc plus : on mesure. Quatre degrés de resserrement sont
  // appliqués l'un après l'autre, et on s'arrête dès que la barre tient.
  // Le dernier recours retire le libellé du bouton principal ; son icône et son
  // infobulle restent, et il reste à sa place.

  const DEGRES_BARRE = 4;

  // Les trois onglets du panneau (Documents, Outils, Signets) tiennent en français avec leur icône ; en allemand, des
  // mots plus longs ne tiennent plus avec : l'icône cède la place, le libellé reste entier. On mesure, on ne devine pas.
  function ajusterLesOnglets() {
    const rangee = document.querySelector('.side .tabs');
    if (!rangee) return;
    rangee.classList.remove('sans-icones');
    if (Array.from(rangee.querySelectorAll('.tab')).some(t => t.scrollWidth > t.clientWidth + 1)) rangee.classList.add('sans-icones');
  }

  function ajusterLaBarre() {
    ajusterLesOnglets();
    const barre = document.getElementById('app-toolbar');
    if (!barre || barre.hidden) return;
    for (let n = 1; n <= DEGRES_BARRE; n++) barre.classList.remove('serre-' + n);
    // Sous 872 px (le point de bascule de la feuille de style : le panneau passe
    // au-dessus du document), la barre passe à la ligne : elle a toute la place
    // qu'elle veut, et la resserrer ne ferait que retirer des mots pour rien.
    // Au-dessus, elle tient sur une ligne, et la fenêtre de l'application ne
    // descend pas sous 880 px (desktop/main.js) : elle ne bascule donc jamais.
    if (window.innerWidth <= 872) return;
    for (let n = 1; n <= DEGRES_BARRE; n++) {
      if (barre.scrollWidth <= barre.clientWidth + 1) return;
      barre.classList.add('serre-' + n);
    }
  }

  // Le redimensionnement arrive par rafales ; on ne mesure qu'une fois par
  // image, sinon chaque pixel de la poignée de fenêtre coûte quatre reflows.
  let barreEnAttente = false;
  function planifierAjustementBarre() {
    if (barreEnAttente) return;
    barreEnAttente = true;
    requestAnimationFrame(() => { barreEnAttente = false; ajusterLaBarre(); });
  }

  function surveillerLaBarre() {
    planifierAjustementBarre();
    window.addEventListener('resize', planifierAjustementBarre);
    // La langue change les libellés, donc leurs largeurs : la traduction de la page se fait juste après l'événement.
    window.addEventListener('aktum-langue', () => setTimeout(planifierAjustementBarre, 80));
    // Les polices arrivent après le premier rendu et changent la largeur des
    // libellés : sans cette mesure-là, la barre est ajustée sur des mesures
    // faites avec la police de secours.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(planifierAjustementBarre).catch(() => {});
  }
