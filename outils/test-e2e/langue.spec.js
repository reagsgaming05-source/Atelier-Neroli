// L'interface en allemand : choisie d'après la langue du système ou d'un clic, elle ne laisse rien en
// français (ni dans la page, ni dans les fenêtres des outils), ne touche pas au contenu des documents,
// et les documents produits portent leurs mentions en allemand.
const { test, expect, pdfDe, textesDuPdf } = require('./aide');

// Un texte resté en français : un mot de liaison, ou une lettre que l'allemand n'a pas.
const FRANCAIS = /\b(le|la|les|une|un|du|pour|avec|dans|sur|est|sont|vous|vos|votre|pas|ne|cette|ces|qui|que|aux|et|ou|par|sans)\b|[éèêàçâîôûœ]/i;
// Ce qui peut rester tel quel : le nom des langues (écrit dans sa langue), celui du produit.
const PERMIS = /Français|Aktum|Deutsch/g;
const fuite = (t) => FRANCAIS.test(t.replace(PERMIS, ''));

// Tous les textes lisibles de la page : les nœuds de texte et les attributs, hors contenu de document.
async function textesLisibles(page, racine) {
  return page.evaluate((sel) => {
    const out = [];
    const base = sel ? document.querySelector(sel) : document.body;
    if (!base) return out;
    const exclu = (e) => e.closest('[translate="no"], svg, canvas, script, style, textarea, [contenteditable]');
    const marcheur = document.createTreeWalker(base, 1 | 4);
    for (let n = marcheur.currentNode; n; n = marcheur.nextNode()) {
      if (n.nodeType === 3) {
        const t = n.nodeValue.replace(/\s+/g, ' ').trim();
        if (t && n.parentElement && !exclu(n.parentElement)) out.push(t);
      } else if (n.nodeType === 1 && !n.closest('[translate="no"]')) {
        for (const a of ['title', 'aria-label', 'placeholder', 'alt']) { const v = n.getAttribute(a); if (v) out.push(v); }
      }
    }
    return out;
  }, racine || null);
}

test.describe('interface en allemand', () => {
  test.use({ locale: 'de-CH' });

  test('la page suit la langue du système et ne laisse aucun texte en français', async ({ app, page }) => {
    await app.pretAvecExemple();
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('de');
    await expect(page.locator('#btn-open')).toHaveAttribute('title', /öffnen/);
    const fr = (await textesLisibles(page)).filter(fuite);
    expect(fr, 'textes restés en français').toEqual([]);
    // l'exemple lui-même est produit en allemand
    expect(await app.resume()).toContain('Seiten');
  });

  test('chaque outil s\'ouvre en allemand', async ({ app, page }) => {
    test.setTimeout(600000);
    await app.pretAvecExemple();
    await page.click('#tab-tools');
    const outils = await page.$$eval('#pane-tools [data-tool]', (bs) => bs.map((b) => b.dataset.tool));
    expect(outils.length).toBeGreaterThan(25);
    const fuites = [];
    const ouverts = [];
    const doubles = [];
    for (const id of outils) {
      await page.goto(require('./aide').PAGE);
      await page.waitForSelector('#app-toolbar', { state: 'visible', timeout: 60000 });
      await app.pretAvecExemple();
      await page.click('#tab-tools');
      const bouton = page.locator('[data-tool="' + id + '"]');
      if (await bouton.isDisabled()) continue;
      await bouton.click();
      let fenetre = true;
      try { await page.waitForSelector('.dialog', { state: 'visible', timeout: 4000 }); } catch (_) { fenetre = false; }
      if (fenetre) ouverts.push(id);
      await page.waitForTimeout(400);
      const textes = await textesLisibles(page, fenetre ? '.dialog' : null);
      textes.filter(fuite).forEach((t) => fuites.push(id + ' : ' + t.slice(0, 160)));
      // un identifiant porté par deux éléments défait « label for » et les références ARIA (la barre de sélection et l'outil de plages en portaient un en commun)
      const dedoubles = await page.evaluate(() => { const vus = new Set(), d = new Set(); document.querySelectorAll('[id]').forEach((e) => { if (vus.has(e.id)) d.add(e.id); vus.add(e.id); }); return [...d]; });
      dedoubles.forEach((i) => doubles.push(id + ' : #' + i));
    }
    expect(doubles, 'identifiants en double').toEqual([]);
    expect(ouverts.length, 'la plupart des outils ouvrent une fenêtre').toBeGreaterThan(15);
    expect(fuites, 'textes restés en français').toEqual([]);
  });
});

test.describe('changer de langue', () => {
  test('le bouton passe du français à l\'allemand et retour, et la langue est retenue', async ({ app, page }) => {
    await app.pretAvecExemple();
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('fr');
    await expect(page.locator('#btn-open')).toHaveAttribute('title', /Ouvrir/);
    await expect(page.locator('#btn-langue')).toHaveText('DE');
    await page.click('#btn-langue');
    await expect(page.locator('#btn-open')).toHaveAttribute('title', /öffnen/);
    await expect(page.locator('#btn-langue')).toHaveText('FR');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('de');
    // un texte créé après le changement est traduit lui aussi
    await app.outil('dossier');
    await expect(page.locator('.dialog .dlg-head')).toContainText('Beilagendossier');
    await app.fermerDialogue();
    // retenue pour la fois suivante
    await page.reload();
    await page.waitForSelector('#app-toolbar', { state: 'visible', timeout: 60000 });
    await expect(page.locator('#btn-open')).toHaveAttribute('title', /öffnen/);
    // et retour au français : chaque texte retrouve son origine
    await page.click('#btn-langue');
    await expect(page.locator('#btn-open')).toHaveAttribute('title', /Ouvrir/);
    const fr = await textesLisibles(page);
    expect(fr.some((t) => /Drucken|[Öö]ffnen|Seiten/.test(t)), 'plus aucun mot allemand').toBe(false);
  });

  test('le contenu des documents n\'est jamais traduit', async ({ app, page }) => {
    await page.goto(require('./aide').PAGE);
    await page.waitForSelector('#app-toolbar', { state: 'visible', timeout: 60000 });
    await page.evaluate(() => { localStorage.setItem('aktum-langue', 'de'); });
    await page.reload();
    await page.waitForSelector('#app-toolbar', { state: 'visible', timeout: 60000 });
    await app.ouvrir('Imprimer.pdf', pdfDe([[{ x: 70, y: 700, taille: 16, texte: 'Imprimer' }, { x: 70, y: 660, taille: 16, texte: 'Page 3 sur 12' }]]));
    await page.waitForSelector('.couche-texte span', { timeout: 30000 });
    const couche = await page.$$eval('.couche-texte', (c) => c.map((x) => x.textContent).join(' | '));
    expect(couche).toContain('Imprimer');
    expect(couche).toContain('Page 3 sur 12');
    // le nom du fichier, lui non plus
    await expect(page.locator('#doc-list .doc-name')).toHaveText('Imprimer.pdf');
    // la recherche montre l'extrait tel qu'il est dans le document
    await page.click('#btn-search');
    await page.fill('#se-q', 'Imprimer');
    await expect(page.locator('.dialog.libre .result .x').first()).toContainText('Imprimer');
  });
});

test.describe('documents produits en allemand', () => {
  test.use({ locale: 'de-CH' });

  test('le dossier de pièces porte son sommaire, ses intercalaires et ses mentions en allemand', async ({ app, page }) => {
    const piece = (titre) => pdfDe([[{ x: 70, y: 700, taille: 20, texte: titre }]]);
    await app.ouvrir('vertrag.pdf', piece('Vertrag'));
    await app.ouvrir('anhang.pdf', piece('Anhang'));
    await app.outil('dossier');
    await page.fill('#do-titre', 'Gemeindedossier');
    await page.click('.dialog .dlg-foot .tb-btn.primary');
    await expect.poll(() => app.dernier(), { timeout: 60000 }).toContain('Dossier');
    await expect.poll(() => app.nbPages()).toBe(5);
    const { octets } = await app.exporter();
    const pages = await textesDuPdf(page, octets);
    expect(pages[0]).toContain('Inhaltsverzeichnis');
    expect(pages[0]).toMatch(/Beilage Nr\.\s*1/);
    expect(pages[0]).toMatch(/S\.\s*\d/);
    expect(pages[1]).toMatch(/BEILAGE NR\.\s*1/);
    expect(pages.join('\n')).not.toMatch(/Pièce n°|PIÈCE|Sommaire/);
  });
});
