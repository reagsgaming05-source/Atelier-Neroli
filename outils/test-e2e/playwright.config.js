// La suite de bout en bout tourne sur la page hors ligne (outils/aktum-pdf-hors-ligne.html),
// celle qui embarque pdf.js, pdf-lib, JSZip et le moteur de reconnaissance : aucun accès
// réseau, donc un résultat qui ne dépend que du code du dépôt.
//
// Le navigateur : celui que « npx playwright install chromium » pose, sauf si
// AKTUM_CHROMIUM donne le chemin d'un Chromium déjà présent (postes de développement
// où le téléchargement est coupé).
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: '*.spec.js',
  // Sur le poste Windows de la CI : pas de qpdf, pikepdf, poppler ni veraPDF. Les scénarios qui jugent le fichier avec eux ont joué sur Linux.
  testIgnore: process.env.AKTUM_SANS_VERIFICATEURS ? ['archivage.spec.js', 'balisage.spec.js', 'caviardage-surfaces.spec.js', 'certificat.spec.js', 'proprietes.spec.js', 'protection.spec.js', 'visuel.spec.js'] : [],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Une nouvelle tentative en CI, sauf pour une version STABLE : un test instable qui passe au
  // deuxième essai ne doit pas laisser partir ce que les postes téléchargent.
  retries: process.env.CI && process.env.AKTUM_CANAL !== 'stable' ? 1 : 0,
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
    launchOptions: process.env.AKTUM_CHROMIUM ? { executablePath: process.env.AKTUM_CHROMIUM } : {},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
});
