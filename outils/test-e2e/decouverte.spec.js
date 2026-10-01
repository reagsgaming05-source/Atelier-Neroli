// L'exemple et la visite (chapitre 02 de l'audit) : les vingt premières minutes décident de l'impression.
//  - le document d'exemple est un dossier de commune imaginaire : un préavis, un tableau, un formulaire, un courrier numérisé,
//    un procès-verbal, une page à signer — de quoi essayer chaque geste sur du vrai texte ;
//  - « Découvrir Aktum PDF en 5 minutes » guide quatre gestes dans une carte qui ne bloque rien.
const { test, expect, textesDuPdf, annotationsDuPdf } = require('./aide');

test.use({ viewport: { width: 1280, height: 860 } });

test.describe('le document d\'exemple', () => {
  test('six pages : du texte, un tableau, un formulaire, un scan sans texte, un procès-verbal, une page à signer', async ({ app, page }) => {
    await app.pretAvecExemple();
    expect(await app.nbPages()).toBe(6);
    const { octets } = await app.exporter();
    const textes = await textesDuPdf(page, octets);
    expect(textes).toHaveLength(6);
    expect(textes[0], 'préavis').toContain('Préavis municipal n° 12/2026');
    expect(textes[0], 'un nom et un numéro à caviarder').toContain('Madame Claire Exemple');
    expect(textes[0]).toContain('021 000 00 00');
    expect(textes[1], 'tableau').toContain('Plan de financement');
    expect(textes[1]).toContain('480 000');
    expect(textes[2], 'formulaire').toContain('Demande de réservation de salle');
    expect(textes[3].trim(), 'le courrier numérisé est une image : aucun texte').toBe('');
    expect(textes[4], 'procès-verbal').toContain('Procès-verbal de la séance');
    expect(textes[5], 'page à signer').toContain('Décision et signature');
    // les noms sont imaginaires : « Exemple » partout, aucune adresse de messagerie réelle
    expect(textes.join('\n')).not.toMatch(/@(?!commune\.example)/);
    const annotations = await annotationsDuPdf(page, octets);
    expect(annotations[2].filter((a) => a.type === 'Widget').length, 'huit champs à remplir sur la page 3').toBe(8);
  });

  test('« budget » se cherche dans le préavis, le tableau et le procès-verbal', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.keyboard.press('Control+f');
    await page.fill('#se-q', 'budget');
    await expect.poll(() => page.locator('#se-compte').textContent(), { timeout: 15000 }).toMatch(/\d+/);
    const nb = Number((await page.locator('#se-compte').textContent()).match(/(\d+)/g).pop());
    expect(nb).toBeGreaterThanOrEqual(5);
  });

  test('en allemand, l\'exemple est en allemand de bout en bout', async ({ app, page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('aktum-langue', 'de'); } catch (e) { /* sans mémoire */ } });
    await page.reload();
    await app.pretAvecExemple();
    const { octets } = await app.exporter();
    const textes = await textesDuPdf(page, octets);
    expect(textes[0]).toContain('Gemeinderatsvorlage Nr. 12/2026');
    expect(textes[0]).toContain('Frau Claire Beispiel');
    expect(textes[4]).toContain('Protokoll der Sitzung');
    expect(textes.join('\n')).not.toMatch(/Préavis|Conseil|commune d'|Exemple-sur/);
  });
});

test.describe('la visite guidée', () => {
  const carte = (page) => page.locator('.decouverte');

  test('quatre gestes, une carte qui ne bloque rien et qui reste quand une fenêtre s\'ouvre', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.keyboard.press('?');
    await page.click('#btn-visite');
    await expect(carte(page)).toBeVisible();
    await expect(carte(page)).toContainText('Étape 1 sur 4');
    await expect(carte(page)).toContainText('Chercher dans le document');
    // 1. la recherche s'ouvre, déjà remplie ; la carte est toujours là
    await carte(page).getByRole('button', { name: 'Chercher « budget »' }).click();
    await expect(page.locator('#se-q')).toHaveValue('budget');
    await expect(carte(page)).toBeVisible();
    // 2. la vue Organiser
    await carte(page).getByRole('button', { name: 'Étape suivante' }).click();
    await expect(carte(page)).toContainText('Étape 2 sur 4');
    await carte(page).getByRole('button', { name: 'Passer en vue Organiser' }).click();
    await expect(page.locator('.vue-mode[data-vue="organiser"]')).toHaveAttribute('aria-pressed', 'true');
    // 3. le caviardage : on revient en lecture, et l'outil s'ouvre
    await carte(page).getByRole('button', { name: 'Étape suivante' }).click();
    await expect(carte(page)).toContainText('Caviarder un nom');
    await carte(page).getByRole('button', { name: /Caviarder une zone/ }).click();
    await expect(page.locator('.dialog, .editor').first()).toBeVisible();
    await expect(carte(page)).toBeVisible();
    // la carte est au-dessus de l'éditeur : on la lit pendant qu'on essaie
    await carte(page).getByRole('button', { name: 'Étape suivante' }).evaluate((b) => { const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (e !== b && !b.contains(e)) throw new Error('la carte est recouverte par ' + (e && e.className)); });
    await page.locator('.editor').getByRole('button', { name: 'Terminer' }).click();
    await expect(page.locator('.editor')).toBeHidden();
    // 4. l'impression, puis la fin
    await carte(page).getByRole('button', { name: 'Étape suivante' }).click();
    await expect(carte(page)).toContainText('Imprimer ou exporter');
    await carte(page).getByRole('button', { name: 'Terminer' }).click();
    await expect(carte(page)).toContainText('C\'est tout');
    await carte(page).getByRole('button', { name: 'Fermer la visite' }).click();
    await expect(carte(page)).toHaveCount(0);
  });

  test('la visite se quitte à tout moment, et ne laisse rien derrière elle', async ({ app, page }) => {
    await app.pretAvecExemple();
    await page.keyboard.press('?');
    await page.click('#btn-visite');
    await expect(carte(page)).toBeVisible();
    await carte(page).getByRole('button', { name: 'Quitter la visite' }).click();
    await expect(carte(page)).toHaveCount(0);
    expect(await app.estModifie(), 'la visite ne modifie pas le document').toBe(false);
  });

  test('avec un vrai document ouvert, l\'exemple s\'ouvre dans un nouvel onglet : le travail n\'est pas touché', async ({ app, page }) => {
    const { pdfVide } = require('./aide');
    await app.pretAvecExemple();
    await app.ouvrir('mon-travail.pdf', pdfVide(2));
    await page.keyboard.press('?');
    await page.click('#btn-visite');
    await expect(carte(page)).toBeVisible();
    await expect.poll(() => page.locator('#onglets .onglet').count()).toBe(2);
    await expect.poll(() => app.nbPages()).toBe(6);
    await carte(page).getByRole('button', { name: 'Quitter la visite' }).click();
    // le premier onglet a gardé son document
    await page.locator('#onglets .onglet').first().click();
    await expect.poll(() => app.nbPages()).toBe(2);
  });

  test('en allemand, la carte est en allemand', async ({ app, page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('aktum-langue', 'de'); } catch (e) { /* sans mémoire */ } });
    await page.reload();
    await app.pretAvecExemple();
    await page.keyboard.press('?');
    await page.click('#btn-visite');
    await expect(carte(page)).toContainText('Schritt 1 von 4');
    await expect(carte(page)).toContainText('Im Dokument suchen');
    await expect(carte(page).getByRole('button', { name: '«Budget» suchen' })).toBeVisible();
  });
});

test.describe('« Vérifier l\'accessibilité »', () => {
  test('dit les manques d\'un document, sur le poste : le scan de l\'exemple n\'a aucun texte à lire', async ({ app, page }) => {
    await app.pretAvecExemple();
    await app.outil('access');
    await expect(page.locator('.access-verdict')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('.access-verdict')).toContainText('1 manque à corriger');
    await expect(page.locator('.access-liste.ko')).toContainText('1 page est une image sans texte (p. 4)');
    // le balisage n'est pas demandé : le rapport le dit, et propose d'aller régler
    await expect(page.locator('.access-liste.avis')).toContainText('balisage n\'est pas demandé');
    await expect(page.locator('.dialog.libre')).toBeVisible();
  });

  test('un document dont tout le texte est lisible et titré : aucun manque', async ({ app, page }) => {
    const { pdfTexte } = require('./aide');
    await app.pretAvecExemple();
    await app.ouvrir('lisible.pdf', pdfTexte(['Un texte lisible.']));
    await app.outil('props');
    await page.fill('#pr-title', 'Un titre');
    await page.locator('.dlg-foot').getByRole('button', { name: 'Enregistrer' }).click();
    await app.outil('access');
    await expect(page.locator('.access-verdict')).toBeVisible({ timeout: 60000 });
    // l'exemple a cédé la place au document : plus de scan, et le titre est posé
    await expect(page.locator('.access-verdict')).toContainText('Aucun manque relevé');
    await expect(page.locator('.access-liste.ko')).toHaveCount(0);
  });

  test('en allemand', async ({ app, page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('aktum-langue', 'de'); } catch (e) { /* sans mémoire */ } });
    await page.reload();
    await app.pretAvecExemple();
    await app.outil('access');
    await expect(page.locator('.access-verdict')).toContainText('Mangel zu korrigieren', { timeout: 60000 });
    const lu = await page.locator('.access-rapport').innerText();
    expect(lu).not.toMatch(/manque|balisage|lecteur d'écran/);
  });
});
