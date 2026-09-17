// La suite de bout en bout tourne sur la page hors ligne (outils/blonay-pdf-hors-ligne.html),
// celle qui embarque pdf.js, pdf-lib, JSZip et le moteur de reconnaissance : aucun accès
// réseau, donc un résultat qui ne dépend que du code du dépôt.
//
// Le navigateur : celui que « npx playwright install chromium » pose, sauf si
// BLONAY_CHROMIUM donne le chemin d'un Chromium déjà présent (postes de développement
// où le téléchargement est coupé).
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: '*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  // Un assemblage de PDF sur une machine chargée prend son temps.
  timeout: 120000,
  expect: { timeout: 20000 },
  use: {
    browserName: 'chromium',
    // Assez large pour la mise en page de bureau : sous 1080 px l'application
    // replie ses libellés, sous 900 px elle passe en colonne unique.
    viewport: { width: 1400, height: 900 },
    launchOptions: process.env.BLONAY_CHROMIUM ? { executablePath: process.env.BLONAY_CHROMIUM } : {},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
});
