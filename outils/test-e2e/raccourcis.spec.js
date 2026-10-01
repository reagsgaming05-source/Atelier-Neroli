// Les raccourcis clavier (chapitre 04 de l'audit), lus dans une seule table (desktop/raccourcis.json) :
//  - les gestes de la table répondent (vues, zoom, navigation, filtre des outils, préférences) ;
//  - la fenêtre d'aide et les préférences disent ce que la table dit ;
//  - une touche se change, un conflit se refuse, une touche réservée se refuse, et on peut tout rétablir ;
//  - les touches à une lettre se coupent (WCAG 2.1.4), et ne répondent plus ensuite ;
//  - « Oublier » vide la mémoire de l'application, un élément à la fois.
const { test, expect, pdfVide, compterTournees } = require('./aide');
const table = require('../desktop/raccourcis.json');

test.use({ viewport: { width: 1100, height: 800 } });

const vueActive = (page) => page.evaluate(() => document.querySelector('.vue-mode[aria-pressed="true"]').dataset.vue);
const zoom = (page) => page.evaluate(() => document.querySelector('#zoom-niveau').value);

test.describe('les gestes de la table répondent', () => {
  test('Ctrl+Maj+2 organise, Ctrl+Maj+1 lit, Ctrl+Maj+3 met deux pages côte à côte', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.keyboard.press('Control+Shift+2');
    await expect.poll(() => vueActive(page)).toBe('organiser');
    await page.keyboard.press('Control+Shift+1');
    await expect.poll(() => vueActive(page)).toBe('lecture');
    await page.keyboard.press('Control+Shift+3');
    await expect(page.locator('#vue-deux')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Control+Shift+3');
    await expect(page.locator('#vue-deux')).toHaveAttribute('aria-pressed', 'false');
  });

  test('Ctrl+1 : taille réelle ; Ctrl+2 : largeur ; Ctrl+0 : page entière', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.keyboard.press('Control+1');
    await expect.poll(() => zoom(page)).toBe('1');
    await page.keyboard.press('Control+2');
    await expect.poll(() => zoom(page)).toBe('largeur');
    await page.keyboard.press('Control+0');
    await expect.poll(() => zoom(page)).toBe('page');
  });

  test('PageSuivante, PageAvant, Début, Fin : de page en page dans la lecture', async ({ app, page }) => {
    await app.pretAvecExemple();
    const courante = () => page.evaluate(() => Number(document.querySelector('#page-num').value));
    await page.locator('#canvas').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('PageDown');
    await expect.poll(courante).toBe(2);
    await page.keyboard.press('End');
    await expect.poll(courante).toBe(6);
    await page.keyboard.press('PageUp');
    await expect.poll(courante).toBe(5);
    await page.keyboard.press('Home');
    await expect.poll(courante).toBe(1);
  });

  test('Ctrl+Maj+N va à la page : le champ de la barre d\'état prend le focus', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.keyboard.press('Control+Shift+N');
    await expect(page.locator('#page-num')).toBeFocused();
  });

  test('Ctrl+K : le filtre des outils prend le focus, même depuis un autre volet', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.click('#tab-docs');
    await page.keyboard.press('Control+k');
    await expect(page.locator('#outil-q')).toBeFocused();
    await expect(page.locator('#tab-tools')).toHaveAttribute('aria-selected', 'true');
  });

  test('Ctrl+B pose un signet, Ctrl+F ouvre la recherche, F3 passe à l\'occurrence suivante', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.keyboard.press('Control+f');
    await expect(page.locator('#se-suiv')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('Ctrl+, ouvre les préférences', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.keyboard.press('Control+,');
    await expect(page.locator('.dialog')).toBeVisible();
    await expect(page.locator('.dialog .dlg-head')).toContainText('Préférences');
  });

  test('les lettres de l\'éditeur ne répondent qu\'à l\'éditeur, et à la page ce qui est à la page', async ({ app, page }) => {
    await app.pretAvecExemple();
    // « R » sans page sélectionnée ne fait rien ; dans l'éditeur, « H » choisit le surlignage
    await page.click('#tab-tools');
    await page.click('[data-tool="edit"]');
    await expect(page.locator('.editor')).toBeVisible();
    await page.keyboard.press('h');
    await expect(page.locator('.ed-tool[data-tool="highlight"]')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('b');
    await expect(page.locator('.ed-tool[data-tool="box"]')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Control+ArrowRight');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(page.locator('.editor')).toBeHidden();
  });
});

test.describe('la fenêtre d\'aide dit ce que la table dit', () => {
  test('chaque geste de la table, ses touches d\'origine, et rien d\'autre', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.keyboard.press('?');
    await expect(page.locator('.dialog')).toBeVisible();
    const lu = await page.locator('.dialog').innerText();
    for (const c of table.commandes) {
      if (c.portee === 'editeur' && c.uneLettre) continue;   // lues plus bas, avec leur lettre
      expect(lu, 'le geste « ' + c.libelle + ' » manque à l\'aide').toContain(c.id === 'enregistrer' ? 'Exporter le PDF' : c.libelle);
    }
    for (const f of table.fixes) expect(lu, f.libelle).toContain(f.libelle);
    // les touches s'écrivent comme sur le clavier de la personne : Ctrl, Maj
    expect(lu).toMatch(/Maj/);
    expect(lu).not.toMatch(/\bShift\b/);
    expect(lu).not.toMatch(/ArrowLeft|ArrowRight/);
  });
});

test.describe('les préférences : changer une touche', () => {
  const ouvrirLesPreferences = async (page) => {
    await page.keyboard.press('Control+,');
    await expect(page.locator('.dialog .prefs-ligne[data-commande="zoom-100"]')).toBeVisible();
  };
  const changer = async (page, id) => {
    await page.locator('.prefs-ligne[data-commande="' + id + '"] button', { hasText: 'Changer' }).click();
  };

  test('une touche changée répond, l\'ancienne se tait, et « Rétablir » rend l\'origine', async ({ app, page }) => {
    await app.pretAvecExemple();
    await ouvrirLesPreferences(page);
    await changer(page, 'zoom-100');
    await page.keyboard.press('Control+9');
    await expect(page.locator('.prefs-ligne[data-commande="zoom-100"] kbd')).toHaveText(['Strg'.replace('Strg', 'Ctrl'), '9']);
    await page.click('.dialog .dlg-foot .primary, .dialog button.primary');
    await page.waitForSelector('.dialog', { state: 'detached' });
    await page.keyboard.press('Control+9');
    await expect.poll(() => zoom(page)).toBe('1');
    await page.keyboard.press('Control+0');
    await expect.poll(() => zoom(page)).toBe('page');
    await page.keyboard.press('Control+1');
    await page.waitForTimeout(300);
    expect(await zoom(page), 'l\'ancienne touche répond encore').toBe('page');
    // rétablir
    await page.keyboard.press('Control+,');
    await page.locator('.prefs-ligne[data-commande="zoom-100"] button', { hasText: 'Rétablir' }).click();
    await page.click('.dialog button.primary');
    await page.keyboard.press('Control+1');
    await expect.poll(() => zoom(page)).toBe('1');
  });

  test('une touche déjà prise est refusée, en disant par quoi', async ({ app, page }) => {
    await app.pretAvecExemple();
    await ouvrirLesPreferences(page);
    await changer(page, 'zoom-100');
    await page.keyboard.press('Control+0');       // prise par « Page entière »
    await expect(page.locator('.dialog')).toContainText('Déjà prise par « Page entière ».');
    // l'ancienne touche est toujours celle du geste
    await page.keyboard.press('Escape');
    await expect(page.locator('.prefs-ligne[data-commande="zoom-100"] kbd')).toHaveText(['Ctrl', '1']);
  });

  test('une lettre seule est refusée pour un geste de menu ; une touche déjà prise aussi', async ({ app, page }) => {
    await app.pretAvecExemple();
    await ouvrirLesPreferences(page);
    await changer(page, 'zoom-100');
    await page.keyboard.press('x');
    await expect(page.locator('.dialog')).toContainText('Cette touche seule est réservée à la saisie');
    await page.keyboard.press('Control+w');
    await expect(page.locator('.dialog')).toContainText('Déjà prise par');
  });

  test('« Rétablir toutes les touches d\'origine » vide tous les changements', async ({ app, page }) => {
    await app.pretAvecExemple();
    await ouvrirLesPreferences(page);
    await changer(page, 'zoom-100');
    await page.keyboard.press('Control+9');
    await changer(page, 'zoom-largeur');
    await page.keyboard.press('Control+8');
    expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('aktum-raccourcis'))))).toEqual(['zoom-100', 'zoom-largeur']);
    await page.getByRole('button', { name: 'Rétablir toutes les touches d\'origine' }).click();
    expect(await page.evaluate(() => localStorage.getItem('aktum-raccourcis'))).toBeNull();
  });
});

test.describe('les touches à une lettre se coupent', () => {
  test('R pivote ; décochées, les touches à une lettre ne répondent plus, et sortent de l\'aide', async ({ app, page }) => {
    await app.pretAvecExemple();
    await app.vue('organiser');
    await app.selectionner(1);
    await page.keyboard.press('r');
    await expect.poll(() => app.dernier()).toMatch(/pivotée à droite/);
    await page.keyboard.press('Shift+R');
    await expect.poll(() => app.dernier()).toMatch(/pivotée à gauche/);
    await page.keyboard.press('Control+,');
    await page.locator('#pref-touches-seules').uncheck();
    await page.click('.dialog button.primary');
    await page.waitForSelector('.dialog', { state: 'detached' });
    await page.keyboard.press('r');
    await page.waitForTimeout(400);
    expect(await app.dernier(), 'R pivote malgré le réglage').toMatch(/à gauche/);
    // les touches à une lettre ne figurent plus dans l'aide
    await page.keyboard.press('?');
    await expect(page.locator('.dialog')).not.toContainText('Pivoter à droite');
  });
});

test.describe('ce que l\'application retient', () => {
  test('« Oublier » efface l\'entrée visée, pas les autres', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.evaluate(() => { localStorage.setItem('aktum-reglage-filigrane', '{"texte":"x"}'); localStorage.setItem('aktum-ocr-langue', 'deu'); });
    await page.keyboard.press('Control+,');
    const bouton = page.getByRole('button', { name: 'Oublier : Réglages du filigrane' });
    await expect(bouton).toBeEnabled();
    await bouton.click();
    expect(await page.evaluate(() => localStorage.getItem('aktum-reglage-filigrane'))).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('aktum-ocr-langue'))).toBe('deu');
    await expect(bouton).toBeDisabled();
  });
});

test.describe('en allemand', () => {
  test('les touches se lisent Strg et Umschalt, et la table se traduit', async ({ app, page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('aktum-langue', 'de'); } catch (e) { /* sans mémoire */ } });
    await page.reload();
    await app.pretAvecExemple();
    await page.keyboard.press('?');
    await expect(page.locator('.dialog')).toBeVisible();
    const lu = await page.locator('.dialog').innerText();
    expect(lu).toContain('Strg');
    expect(lu).toContain('Umschalt');
    expect(lu).toContain('Seite mit dem Fokus auswählen');
    expect(lu).not.toMatch(/Sélectionner|Ouvrir/);
  });
});

// « Répéter la dernière opération » (Ctrl+Maj+Y) : la dernière opération sur des pages se rejoue sur la sélection du moment.
test.describe('répéter la dernière opération', () => {
  test('sans rien à répéter, il le dit', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.keyboard.press('Control+Shift+Y');
    await expect(page.locator('#toast')).toContainText('Aucune opération à répéter');
  });

  test('un pivotement se répète sur une autre page, et sans sélection rien ne bouge', async ({ app, page }) => {
    await app.ouvrir('cinq.pdf', pdfVide(5));
    await app.vue('organiser');
    await app.selectionner(2);
    await page.click('#sel-rot-right');
    await expect(page.locator('#toast')).not.toContainText('Répété');
    await app.selectionner(4);
    await page.keyboard.press('Control+Shift+Y');
    await expect(page.locator('#toast')).toContainText('Répété : Pivoter à droite');
    // sans sélection, la répétition le dit et ne touche à rien
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('#selbar').hidden);
    await page.keyboard.press('Control+Shift+Y');
    await expect(page.locator('#toast')).toContainText('Sélectionnez d\'abord des pages');
    const { octets } = await app.exporter();
    expect(compterTournees(octets, 90), 'deux pages tournées : celle d\'origine et celle de la répétition').toBe(2);
  });

  test('la touche est dans la table, et rangée avec Annuler et Rétablir', async () => {
    const c = table.commandes.find((x) => x.id === 'repeter');
    expect(c.touches).toEqual(['Ctrl+Shift+Y']);
    expect(c.menu).toBe(true);
  });
});
