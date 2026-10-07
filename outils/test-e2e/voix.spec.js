// Lire à voix haute (chapitre 09) : le texte est dit dans l'ordre de lecture par une voix du poste ; une voix distante n'est jamais
// proposée ; sans voix locale, l'outil le dit. La synthèse du navigateur est remplacée par une fausse, qui note ce qu'on lui fait dire.
const { test, expect, pdfDe } = require('./aide');

const ligne = (y, a, b) => [{ x: 70, y, texte: a }, { x: 300, y, texte: b }];
const doc = () => pdfDe([
  [{ x: 70, y: 780, taille: 24, texte: 'Préavis municipal' },
    { x: 70, y: 740, taille: 10, texte: 'Le Conseil a adopté le préavis. Il charge la Municipalité de son exécution.' },
    ...ligne(660, 'Libellé', 'Montant'), ...ligne(640, 'Transport', '1240')],
  [{ x: 70, y: 780, taille: 10, texte: 'Deuxième page du préavis.' }],
]);

async function fausseSynthese(page, voix) {
  await page.evaluate((voix) => {
    window.__dit = []; window.__etat = [];
    class Enonce { constructor(t) { this.text = t; } }
    const fake = {
      getVoices: () => voix, speaking: false,
      speak(u) { window.__dit.push({ texte: u.text, voix: u.voice && u.voice.name, rate: u.rate }); setTimeout(() => { if (u.onend) u.onend({}); }, 5); },
      cancel() { window.__etat.push('cancel'); }, pause() { window.__etat.push('pause'); }, resume() { window.__etat.push('resume'); },
      addEventListener() {}, removeEventListener() {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    window.SpeechSynthesisUtterance = Enonce;
  }, voix);
}
const LOCALES = [
  { name: 'Voix distante', lang: 'fr-FR', localService: false },
  { name: 'Hortense', lang: 'fr-FR', localService: true },
  { name: 'Hedda', lang: 'de-DE', localService: true },
];

test('le texte est dit dans l\'ordre : titre, phrases, tableau ligne à ligne, page suivante', async ({ app, page }) => {
  await app.ouvrir('preavis.pdf', doc());
  await fausseSynthese(page, LOCALES);
  await app.outil('voix');
  const options = await page.locator('#vx-voix option').allTextContents();
  expect(options.join('|'), 'la voix distante n\'est pas proposée').not.toContain('distante');
  expect(options.join('|')).toContain('Hortense');
  await page.locator('#vx-lire').click();
  await expect(page.locator('.dialog')).toContainText('Lecture terminée', { timeout: 20000 });
  const dit = await page.evaluate(() => window.__dit);
  expect(dit.map(d => d.texte)).toEqual([
    'Préavis municipal', 'Le Conseil a adopté le préavis.', 'Il charge la Municipalité de son exécution.',
    'Libellé, Montant', 'Transport, 1240', 'Deuxième page du préavis.']);
  expect(dit[0].voix, 'la voix française est choisie pour un document français').toBe('Hortense');
});

test('pause, reprise, arrêt ; fermer la boîte arrête la lecture', async ({ app, page }) => {
  await app.ouvrir('preavis.pdf', doc());
  await fausseSynthese(page, LOCALES);
  await app.outil('voix');
  await page.locator('#vx-pause').click();
  await expect(page.locator('#vx-pause')).toHaveText('Reprendre');
  await page.locator('#vx-pause').click();
  await expect(page.locator('#vx-pause')).toHaveText('Pause');
  await page.locator('#vx-arret').click();
  await page.keyboard.press('Escape');
  const etat = await page.evaluate(() => window.__etat);
  expect(etat.slice(0, 2)).toEqual(['pause', 'resume']);
  expect(etat.filter(x => x === 'cancel').length, 'Arrêter, puis la fermeture de la boîte, coupent la voix').toBeGreaterThanOrEqual(2);
});

test('la vitesse choisie est celle de la voix', async ({ app, page }) => {
  await app.ouvrir('preavis.pdf', doc());
  await fausseSynthese(page, LOCALES);
  await app.outil('voix');
  await page.locator('#vx-vitesse').fill('15');
  await expect(page.locator('.dialog')).toContainText('1.5 ×');
  await page.selectOption('#vx-pages', 'une');
  await page.locator('#vx-lire').click();
  await expect(page.locator('.dialog')).toContainText('Lecture terminée', { timeout: 20000 });
  const dit = await page.evaluate(() => window.__dit);
  expect(dit.every(d => Math.abs(d.rate - 1.5) < 1e-9)).toBe(true);
  expect(dit.map(d => d.texte)).not.toContain('Deuxième page du préavis.');
});

test('sans voix locale : l\'outil le dit et ne lit rien', async ({ app, page }) => {
  await app.ouvrir('preavis.pdf', doc());
  await fausseSynthese(page, [{ name: 'Voix distante', lang: 'fr-FR', localService: false }]);
  await app.outil('voix');
  await expect(page.locator('.dialog')).toContainText('Aucune voix n\'est installée sur ce poste');
  await expect(page.locator('#vx-lire')).toBeDisabled();
});

test('sans synthèse vocale du tout : un message, pas de boîte vide', async ({ app, page }) => {
  await app.ouvrir('preavis.pdf', doc());
  await page.evaluate(() => { Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); });
  await page.click('#tab-tools');
  await page.click('[data-tool="voix"]');
  await expect(page.locator('.toast').filter({ hasText: 'pas de synthèse vocale' })).toBeVisible();
});
