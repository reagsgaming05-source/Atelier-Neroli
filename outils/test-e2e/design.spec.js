// La mise en page et le panneau d'outils : ce que l'audit avait mesuré de cassé, gardé en l'état réparé.
//  - le panneau tient ses trois onglets, en français comme en allemand (« Plan » s'affichait « Pla ») ;
//  - la barre d'outils tient sur une ligne jusqu'au point de bascule, et la bascule empile au lieu de casser la grille
//    (un pixel de moins coûtait 96 px de large au document) ;
//  - les outils se voient (grille de deux colonnes, groupes qui se replient et se souviennent), se trouvent
//    (« biffer », « livret », « surligner », en allemand aussi) et mènent là où ils se font.
const { test, expect, pdfDe } = require('./aide');

// On lit la page n : le défilement est fini (la page courante ne change plus) avant qu'on aille toucher à un outil.
async function lirePage(page, n) {
  await page.fill('#page-num', String(n));
  await page.press('#page-num', 'Enter');
  await page.waitForFunction((n) => {
    const f = document.querySelectorAll('#lecture .feuille-vue')[n - 1];
    return f && Math.abs(f.getBoundingClientRect().top - document.querySelector('#canvas').getBoundingClientRect().top) < 80 && document.querySelector('#page-num').value === String(n);
  }, n, { timeout: 15000 });
  await page.waitForTimeout(400);
}

const mesure = (page) => page.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), droite: Math.round(b.right), bas: Math.round(b.bottom) }; };
  return { fenetre: innerWidth, defileDeCote: document.documentElement.scrollWidth > innerWidth, barre: r('.toolbar'), side: r('.side'), canvas: r('.canvas'), export: r('#btn-export') };
});

test.describe('mise en page', () => {
  test.use({ viewport: { width: 1500, height: 800 } });

  for (const largeur of [1500, 1366, 1000, 880, 873]) {
    test('à ' + largeur + ' px : barre sur une ligne, bouton principal visible, deux colonnes', async ({ app, page }) => {
      await page.setViewportSize({ width: largeur, height: 760 });
      await app.pretAvecExemple();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);
      const m = await mesure(page);
      expect(m.defileDeCote, 'la page défile de côté').toBe(false);
      expect(m.barre.h, 'la barre tient sur une ligne').toBe(46);
      expect(m.export.droite, 'le bouton principal sort de la fenêtre').toBeLessThanOrEqual(largeur);
      expect(m.side.w).toBe(320);
      expect(m.canvas.x).toBeGreaterThanOrEqual(m.side.droite - 1);
      expect(m.canvas.w, 'le document garde le reste de la largeur').toBeGreaterThan(largeur - 320 - 4);
    });
  }

  for (const largeur of [872, 820, 700]) {
    test('à ' + largeur + ' px : le panneau passe au-dessus du document, qui garde toute la largeur', async ({ app, page }) => {
      await page.setViewportSize({ width: largeur, height: 900 });
      await app.pretAvecExemple();
      await page.waitForTimeout(400);
      const m = await mesure(page);
      expect(m.defileDeCote).toBe(false);
      expect(m.side.w, 'le panneau prend la largeur').toBe(largeur);
      expect(m.canvas.w, 'le document prend la largeur').toBe(largeur);
      expect(m.canvas.y, 'le document est sous le panneau').toBeGreaterThanOrEqual(m.side.bas - 1);
    });
  }
});

for (const [nom, locale] of [['français', 'fr-CH'], ['allemand', 'de-CH']]) {
  test.describe('en ' + nom, () => {
    test.use({ locale, viewport: { width: 1366, height: 768 } });

    test('les trois onglets du panneau tiennent dans leur rangée, libellé entier', async ({ app, page }) => {
      await app.pretAvecExemple();
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(() => {
        const rangee = document.querySelector('.tabs');
        return { rangee: [rangee.scrollWidth, rangee.clientWidth], onglets: [...rangee.querySelectorAll('.tab')].map(t => ({ t: t.textContent.trim(), sw: t.scrollWidth, cw: t.clientWidth })) };
      });
      expect(r.rangee[0], 'la rangée d\'onglets déborde').toBeLessThanOrEqual(r.rangee[1]);
      for (const o of r.onglets) expect(o.sw, 'l\'onglet « ' + o.t + ' » est coupé').toBeLessThanOrEqual(o.cw);
      expect(r.onglets.map((o) => o.t)).toEqual(nom === 'français' ? ['Documents', 'Outils', 'Signets'] : ['Dokumente', 'Werkzeuge', 'Lesezeichen']);
    });
  });
}

test.describe('le panneau d\'outils', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('les trente outils y sont, chacun une fois, tous colorés, et la moitié se voit sans défiler', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.click('#tab-tools');
    const outils = await page.evaluate(() => [...document.querySelectorAll('#tool-groups .tool')].map((b) => {
      const r = b.getBoundingClientRect(), panneau = document.querySelector('#pane-tools').getBoundingClientRect();
      return { id: b.dataset.tool, teinte: !!b.querySelector('svg').style.color, visible: r.bottom <= panneau.bottom + 1 && r.top >= panneau.top };
    }));
    expect(outils.length).toBeGreaterThanOrEqual(30);
    expect(new Set(outils.map((o) => o.id)).size, 'un outil apparaît deux fois').toBe(outils.length);
    expect(outils.filter((o) => !o.teinte).map((o) => o.id), 'outils sans couleur (clé de TEINTES_OUTILS fausse)').toEqual([]);
    expect(outils.filter((o) => o.visible).length, 'outils visibles à 1366 × 768').toBeGreaterThanOrEqual(14);
  });

  test('le caviardage se trouve dans « Protéger » comme dans « Document », sous son nom entier', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.click('#tab-tools');
    const dansProteger = page.locator('[data-groupe="proteger"] [data-tool="caviarder"] .t-name');
    await expect(dansProteger).toHaveText('Rechercher, remplacer, caviarder');
    await expect(page.locator('[data-groupe="document"] [data-tool="search"] .t-name')).toHaveText('Rechercher, remplacer, caviarder');
    // « Exporter le PDF » n'est plus une ligne du volet : c'est le bouton principal de la barre
    await expect(page.locator('#tool-groups [data-tool="exp-pdf"]')).toHaveCount(0);
    // « Aplatir » est une conversion : elle se range avec l'export
    await expect(page.locator('[data-groupe="exporter"] [data-tool="flatten"]')).toHaveCount(1);
  });

  test('un groupe se replie, et le choix est retenu au rechargement', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.click('#tab-tools');
    const tete = page.locator('[data-groupe="organiser"] .groupe-tete');
    await expect(tete).toHaveAttribute('aria-expanded', 'true');
    await tete.click();
    await expect(tete).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#grille-organiser')).toBeHidden();
    await page.reload();
    await app.pretAvecExemple();
    await page.click('#tab-tools');
    await expect(page.locator('[data-groupe="organiser"] .groupe-tete')).toHaveAttribute('aria-expanded', 'false');
    await page.locator('[data-groupe="organiser"] .groupe-tete').click();
    await expect(page.locator('#grille-organiser')).toBeVisible();
  });

  test('le volet choisi est retenu, comme la vue et le thème', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.click('#tab-plan');
    await expect(page.locator('#tab-plan')).toHaveAttribute('aria-selected', 'true');
    await page.reload();
    await app.pretAvecExemple();
    await expect(page.locator('#tab-plan')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#pane-plan')).toBeVisible();
    await page.click('#tab-docs');
  });

  test('le filtre connaît les mots qu\'on tape sans connaître le nom des outils', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.click('#tab-tools');
    const trouve = async (mot) => {
      await page.fill('#outil-q', mot);
      return page.evaluate(() => [...document.querySelectorAll('#tool-groups .tool')].map((b) => b.dataset.tool));
    };
    // le terme d'Acrobat pour le caviardage
    expect(await trouve('biffer')).toEqual(expect.arrayContaining(['caviarder-zone', 'caviarder', 'search']));
    // le nom d'un groupe
    const organiser = await trouve('organiser');
    expect(organiser).toEqual(expect.arrayContaining(['fusionner', 'split', 'dossier']));
    // des gestes qui existent ailleurs : la barre, l'éditeur de page, les lots
    expect(await trouve('livret')).toContain('cmd-imprimer');
    expect(await trouve('surligner')).toContain('ed-highlight');
    expect(await trouve('compresser')).toEqual(expect.arrayContaining(['compress', 'lot-compresser']));
    expect(await trouve('csv')).toEqual(expect.arrayContaining(['serie', 'tableau']));
    // chaque mot compte : « pdf archive » ne trouve pas tout ce qui parle de PDF
    expect(await trouve('pdf archive')).toEqual(['archiver']);
    // ce qui n'existe pas le dit
    await page.fill('#outil-q', 'zzzz');
    await expect(page.locator('.outil-rien')).toBeVisible();
  });

  test('« Surligner » du filtre ouvre l\'éditeur sur la page qu\'on lit, outil déjà choisi', async ({ app, page }) => {
    await app.pretAvecExemple();
    // on lit la page 3
    await lirePage(page, 3);
    await page.click('#tab-tools');
    await page.fill('#outil-q', 'surligner');
    await page.click('[data-tool="ed-highlight"]');
    await expect(page.locator('.editor')).toBeVisible();
    await expect(page.locator('#ed-label')).toContainText('3');
    await expect(page.locator('.ed-tool[data-tool="highlight"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('« Caviarder une zone » et « Éditeur de page » partent de la page qu\'on lit, pas de la première', async ({ app, page }) => {
    await app.pretAvecExemple();
    await lirePage(page, 4);
    await page.click('#tab-tools');
    await page.click('[data-tool="caviarder-zone"]');
    await expect(page.locator('.editor')).toBeVisible();
    await expect(page.locator('#ed-label')).toContainText('4');
    await expect(page.locator('.ed-tool[data-tool="redact"]')).toHaveAttribute('aria-pressed', 'true');
    await page.click('.ed-head .tb-btn.primary');
    await page.click('[data-tool="edit"]');
    await expect(page.locator('#ed-label')).toContainText('4');
  });
});

test.describe('la sélection se voit en lecture', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('Ctrl+A en vue Lire met un liseré sur chaque feuille, que la barre de sélection annonce', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.keyboard.press('Control+a');
    await expect(page.locator('#selbar')).toBeVisible();
    const n = await app.nbPages();
    await expect(page.locator('#lecture .feuille-vue.selected')).toHaveCount(n);
    await page.keyboard.press('Escape');
    await expect(page.locator('#lecture .feuille-vue.selected')).toHaveCount(0);
  });
});

test.describe('en allemand, on cherche en allemand', () => {
  test.use({ locale: 'de-CH', viewport: { width: 1366, height: 768 } });

  test('les mots allemands trouvent les outils, et les groupes portent un nom allemand', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.click('#tab-tools');
    const trouve = async (mot) => {
      await page.fill('#outil-q', mot);
      return page.evaluate(() => [...document.querySelectorAll('#tool-groups .tool')].map((b) => b.dataset.tool));
    };
    expect(await trouve('schwärzen')).toEqual(expect.arrayContaining(['caviarder-zone', 'caviarder', 'search']));
    expect(await trouve('zusammenführen')).toContain('fusionner');
    expect(await trouve('Broschüre')).toContain('cmd-imprimer');
    await page.fill('#outil-q', '');
    const titres = await page.locator('.groupe-tete .g-titre').allTextContents();
    expect(titres.length).toBeGreaterThanOrEqual(5);
    expect(titres.join(' ')).not.toMatch(/Organiser|Modifier|Exporter|Protéger/);
  });
});
