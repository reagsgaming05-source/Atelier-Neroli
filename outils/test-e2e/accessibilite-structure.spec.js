// L'accessibilité de l'application elle-même (chapitre 05 de l'audit), gardée en l'état réparé :
// l'éditeur de page est une boîte modale, les messages d'état s'entendent, la grille de pages est une liste à choix
// (un arrêt de tabulation, les flèches), les rôles composites ne contiennent que ce qu'ils doivent, il y a des titres
// et des repères, et la vue Lecture s'expose page par page.
const { test, expect, pdfVide, pdfDe } = require('./aide');

test.use({ viewport: { width: 1100, height: 800 } });

test.describe('l\'éditeur de page est une boîte modale', () => {
  test('rôle, fond inerte, focus à l\'entrée, Tab qui tourne, focus rendu à la sortie', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.click('#tab-tools');
    const bouton = page.locator('[data-tool="edit"]');
    await bouton.focus();
    await bouton.click();
    const editeur = page.locator('.editor');
    await expect(editeur).toBeVisible();
    await expect(editeur).toHaveAttribute('role', 'dialog');
    await expect(editeur).toHaveAttribute('aria-modal', 'true');
    await expect(editeur).toHaveAttribute('aria-label', /./);
    // tout le fond est retiré du clavier et de l'arbre d'accessibilité
    for (const sel of ['#app-toolbar', '#app-main', '#app-status']) {
      expect(await page.evaluate((s) => { const n = document.querySelector(s); return [n.inert, n.getAttribute('aria-hidden')]; }, sel)).toEqual([true, 'true']);
    }
    // le focus est entré dans l'éditeur, et Tab y tourne
    const dedans = () => page.evaluate(() => document.querySelector('.editor').contains(document.activeElement));
    expect(await dedans(), 'le focus n\'est pas entré dans l\'éditeur').toBe(true);
    for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); expect(await dedans(), 'Tab est sorti de l\'éditeur (' + (i + 1) + ')').toBe(true); }
    for (let i = 0; i < 40; i++) { await page.keyboard.press('Shift+Tab'); expect(await dedans(), 'Maj+Tab est sorti de l\'éditeur').toBe(true); }
    // le zoom de l'éditeur a un nom
    expect(await page.locator('#ed-zoom').getAttribute('aria-label')).toBeTruthy();
    // Échap referme, le fond revient, le focus retourne au bouton qui avait ouvert
    await page.keyboard.press('Escape');
    await expect(editeur).toBeHidden();
    for (const sel of ['#app-toolbar', '#app-main', '#app-status']) {
      expect(await page.evaluate((s) => { const n = document.querySelector(s); return [n.inert, n.getAttribute('aria-hidden')]; }, sel)).toEqual([false, null]);
    }
    expect(await page.evaluate(() => document.activeElement && document.activeElement.dataset.tool)).toBe('edit');
  });
});

test.describe('les messages d\'état s\'entendent', () => {
  test('#last est une région vive, #progress une barre de progression, une erreur une alerte', async ({ app, page }) => {
    await app.pretAvecExemple();
    expect(await page.locator('#last').getAttribute('aria-live')).toBe('polite');
    expect(await page.locator('#last').getAttribute('role')).toBe('status');
    const barre = page.locator('#progress');
    expect(await barre.getAttribute('role')).toBe('progressbar');
    for (const a of ['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-label']) expect(await barre.getAttribute(a), a).not.toBeNull();
    // un geste dont le résultat n'était annoncé nulle part : retirer une page
    await app.vue('organiser');
    await page.locator('#pages .tile').first().click();
    await page.keyboard.press('Delete');
    await expect(page.locator('#last')).toContainText(/supprimée/);
    // une erreur est une alerte, le reste un statut
    const roles = await page.evaluate(() => {
      // le toast se lit par son attribut : on déclenche un message d'erreur et un message simple par les gestes de l'application
      return document.querySelector('#toast').getAttribute('role');
    });
    expect(['status', 'alert']).toContain(roles);
  });

  test('un message d\'erreur est annoncé en alerte', async ({ app, page }) => {
    await app.pretAvecExemple();
    // « Chercher » sans document ne dit rien ; un fichier qui n'est pas un PDF dit une erreur
    await page.setInputFiles('#file-input', { name: 'faux.pdf', mimeType: 'application/pdf', buffer: Buffer.from('ceci n\'est pas un PDF') });
    await expect(page.locator('#toast')).toHaveAttribute('role', 'alert');
    await expect(page.locator('#toast')).toHaveAttribute('aria-live', 'assertive');
  });
});

test.describe('la grille de pages est une liste à choix', () => {
  test('un seul arrêt de tabulation, des flèches dans les deux dimensions, des boutons hors de la tabulation', async ({ app, page }) => {
    await app.pretAvecExemple();
    await app.vue('organiser');
    const etat = await page.evaluate(() => {
      const t = [...document.querySelectorAll('#pages .tile')];
      return {
        arrets: t.filter((x) => x.tabIndex === 0).length, total: t.length,
        boutons: [...document.querySelectorAll('#pages .tile-tools button')].filter((b) => b.tabIndex >= 0).length,
        champs: [...document.querySelectorAll('#pages .tile .pos')].filter((b) => b.tabIndex >= 0).length,
      };
    });
    expect(etat.total).toBeGreaterThanOrEqual(6);
    expect(etat.arrets, 'un seul arrêt de tabulation pour toute la grille').toBe(1);
    expect(etat.boutons, 'les boutons de vignette sont hors de la tabulation').toBe(0);
    expect(etat.champs).toBe(0);
    // les flèches vont de page en page, haut et bas à la rangée voisine
    await page.locator('#pages .tile').first().focus();
    await page.keyboard.press('ArrowRight');
    const rang = () => page.evaluate(() => [...document.querySelectorAll('#pages .tile')].indexOf(document.activeElement));
    expect(await rang()).toBe(1);
    // le dernier qui a eu le focus devient l'arrêt de tabulation
    expect(await page.evaluate(() => document.querySelectorAll('#pages .tile[tabindex="0"]').length)).toBe(1);
    expect(await page.evaluate(() => [...document.querySelectorAll('#pages .tile')].findIndex((t) => t.tabIndex === 0))).toBe(1);
    const colonnes = await page.evaluate(() => { const t = [...document.querySelectorAll('#pages .tile')]; return t.filter((x) => x.getBoundingClientRect().top === t[0].getBoundingClientRect().top).length; });
    if (colonnes < 6) {
      await page.keyboard.press('ArrowDown');
      expect(await rang(), 'Bas va à une page de la rangée suivante').toBeGreaterThanOrEqual(colonnes);
      await page.keyboard.press('ArrowUp');
      expect(await rang(), 'Haut revient à la première rangée').toBeLessThan(colonnes);
    }
    await page.keyboard.press('End');
    expect(await rang()).toBe(5);
    await page.keyboard.press('Home');
    expect(await rang()).toBe(0);
    // la position se saisit au clavier par la touche P
    await page.keyboard.press('p');
    expect(await page.evaluate(() => document.activeElement.className)).toContain('pos');
  });
});

test.describe('rôles et repères', () => {
  test('les tablist ne contiennent que des onglets, ont un nom, et commandent quelque chose', async ({ app, page }) => {
    await app.pretAvecExemple();
    const r = await page.evaluate(() => [...document.querySelectorAll('[role="tablist"]')].map((l) => ({
      nom: l.getAttribute('aria-label') || '', enfants: [...l.children].map((c) => c.getAttribute('role') || c.tagName.toLowerCase()),
    })));
    expect(r.length).toBeGreaterThanOrEqual(2);
    for (const l of r) { expect(l.nom, 'un tablist sans nom').not.toBe(''); expect(l.enfants.every((e) => e === 'tab'), 'un tablist contient autre chose que des onglets : ' + l.enfants).toBe(true); }
    // les onglets de documents commandent la zone des pages, qui porte le nom de l'onglet actif
    const doc = await page.evaluate(() => { const t = document.querySelector('.onglets-liste [role="tab"]'); return t ? { controls: t.getAttribute('aria-controls'), id: t.id, etiquette: document.querySelector('#canvas').getAttribute('aria-labelledby') } : null; });
    expect(doc && doc.controls).toBe('canvas');
    expect(doc.etiquette).toBe(doc.id);
    // le bouton de repli n'est plus dans un tablist
    expect(await page.evaluate(() => !!document.querySelector('[role="tablist"] #btn-replier'))).toBe(false);
  });

  test('l\'application a des titres, des repères nommés, et aucune barre d\'outils qui promet des flèches', async ({ app, page }) => {
    await app.pretAvecExemple();
    const titres = await page.evaluate(() => [...document.querySelectorAll('h1, h2, h3')].map((h) => h.tagName + ':' + h.textContent.trim()));
    expect(titres.some((t) => t.startsWith('H1:'))).toBe(true);
    expect(titres.filter((t) => t.startsWith('H2:')).length).toBeGreaterThanOrEqual(2);
    expect(titres.filter((t) => t.startsWith('H3:')).length).toBeGreaterThanOrEqual(1);
    // « toolbar » promet un arrêt de tabulation et des flèches : on ne la déclare plus où ce n'est pas tenu
    expect(await page.evaluate(() => document.querySelectorAll('[role="toolbar"]').length)).toBe(0);
    // le sélecteur de fichiers n'est plus un bouton anglais dans l'arbre
    expect(await page.locator('#file-input').getAttribute('aria-hidden')).toBe('true');
    // tout bouton sans texte a un nom
    const sansNom = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => !b.closest('[hidden]') && !b.textContent.trim() && !b.getAttribute('aria-label')).map((b) => b.id || b.className));
    expect(sansNom, 'boutons sans nom').toEqual([]);
  });

  test('une ligne de document n\'est plus un bouton qui en contient un autre', async ({ app, page }) => {
    await app.pretAvecExemple();
    const r = await page.evaluate(() => {
      const ligne = document.querySelector('#doc-list .doc');
      return { role: ligne.getAttribute('role'), nom: ligne.querySelector('.doc-main') ? ligne.querySelector('.doc-main').tagName : null, retrait: !!ligne.querySelector('.doc-rm'),
        imbriques: [...ligne.querySelectorAll('button')].filter((b) => b.parentElement.closest('button')).length };
    });
    expect(r.role).toBeNull();
    expect(r.nom).toBe('BUTTON');
    expect(r.retrait).toBe(true);
    expect(r.imbriques, 'un bouton dans un bouton').toBe(0);
  });
});

test.describe('la vue Lecture s\'expose page par page', () => {
  test('chaque feuille est une région nommée, et un texte nettement plus gros est un titre', async ({ app, page }) => {
    await app.ouvrir('doc.pdf', pdfDe([
      [{ x: 60, y: 780, taille: 28, texte: 'Rapport annuel' }, { x: 60, y: 740, taille: 11, texte: 'Premier alinea du rapport, assez long pour etre du texte courant.' },
       { x: 60, y: 720, taille: 11, texte: 'Deuxieme alinea du rapport, lui aussi du texte courant.' }, { x: 60, y: 700, taille: 11, texte: 'Troisieme alinea du rapport.' },
       { x: 60, y: 680, taille: 11, texte: 'Quatrieme alinea du rapport.' }],
      [{ x: 60, y: 780, taille: 11, texte: 'Page deux.' }],
    ]));
    await page.waitForFunction(() => document.querySelectorAll('#lecture .feuille-vue').length === 2);
    const regions = await page.evaluate(() => [...document.querySelectorAll('#lecture .feuille-vue')].map((f) => [f.getAttribute('role'), f.getAttribute('aria-label')]));
    expect(regions[0][0]).toBe('region');
    expect(regions[0][1]).toMatch(/^Page 1 sur 2/);
    expect(regions[1][1]).toMatch(/^Page 2 sur 2/);
    await page.waitForFunction(() => document.querySelector('#lecture .feuille-vue .couche-texte span'), null, { timeout: 30000 });
    const titres = await page.evaluate(() => [...document.querySelectorAll('#lecture [role="heading"]')].map((h) => [h.textContent.trim(), h.getAttribute('aria-level')]));
    expect(titres).toEqual([['Rapport annuel', '3']]);
  });
});
