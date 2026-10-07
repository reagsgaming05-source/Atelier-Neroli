// Recadrer (chapitre 09) : la page devient plus petite, du bon côté, y compris tournée ; un document recadré se corrige et s'annote
// au bon endroit (l'origine de la zone visible n'est plus en (0, 0)).
const { test, expect, pdfDe, texteDuPdf } = require('./aide');

async function tailles(page, octets) {
  return page.evaluate(async (b64) => {
    const bin = atob(b64); const data = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
    const doc = await window.pdfjsLib.getDocument({ data }).promise;
    const out = [];
    for (let i = 1; i <= doc.numPages; i++) { const v = (await doc.getPage(i)).getViewport({ scale: 1 }); out.push([Math.round(v.width * 10) / 10, Math.round(v.height * 10) / 10]); }
    return out;
  }, Buffer.from(octets).toString('base64'));
}
const mm = (v) => Math.round(v * 72 / 25.4 * 10) / 10;

test('recadrer 20 mm en haut et 10 mm à gauche : la page perd ces bandes-là', async ({ app, page }) => {
  await app.ouvrir('plan.pdf', pdfDe([[{ x: 70, y: 700, taille: 18, texte: 'Plan du rez-de-chaussée' }]]));
  await app.outil('recadrer');
  await page.fill('#rc-haut', '20'); await page.fill('#rc-gauche', '10');
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  await expect.poll(() => app.dernier(), { timeout: 30000 }).toContain('page recadrée');
  const { octets } = await app.exporter();
  const [[w, h]] = await tailles(page, octets);
  expect(w).toBeCloseTo(595 - mm(10), 0);
  expect(h).toBeCloseTo(842 - mm(20), 0);
  expect(await texteDuPdf(page, octets), 'le contenu est resté').toContain('Plan du rez-de-chaussée');
});

test('une page tournée de 90° se recadre du côté qu\'on voit', async ({ app, page }) => {
  await app.ouvrir('plan.pdf', pdfDe([[{ x: 70, y: 700, taille: 18, texte: 'Plan' }]]));
  await app.vue('organiser');
  await app.selectionner(1);
  await page.keyboard.press('r');                       // pivoter à droite
  await app.outil('recadrer');
  await page.fill('#rc-haut', '20');
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  await expect.poll(() => app.dernier(), { timeout: 30000 }).toContain('page recadrée');
  const { octets } = await app.exporter();
  const [[w, h]] = await tailles(page, octets);
  // tournée, la page se voit en paysage : 842 × 595 ; le haut qu'on voit perd 20 mm de hauteur, la largeur ne bouge pas
  expect(w).toBeCloseTo(842, 0);
  expect(h).toBeCloseTo(595 - mm(20), 0);
});

test('le rognage automatique ne garde que le contenu et un peu d\'air', async ({ app, page }) => {
  await app.ouvrir('plan.pdf', pdfDe([[{ x: 200, y: 400, taille: 30, texte: 'CENTRE' }]]));
  await app.outil('recadrer');
  await page.locator('#rc-auto').check();
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  await expect.poll(() => app.dernier(), { timeout: 30000 }).toContain('page recadrée');
  const { octets } = await app.exporter();
  const [[w, h]] = await tailles(page, octets);
  expect(w, 'bien plus étroite que A4').toBeLessThan(250);
  expect(h, 'bien moins haute que A4').toBeLessThan(100);
  expect(await texteDuPdf(page, octets)).toContain('CENTRE');
});

test('une annotation posée sur une page recadrée tombe où on l\'a posée', async ({ app, page }) => {
  await app.ouvrir('plan.pdf', pdfDe([[{ x: 70, y: 700, taille: 18, texte: 'Plan' }]]));
  await app.outil('recadrer');
  await page.fill('#rc-gauche', '30'); await page.fill('#rc-bas', '30');
  await page.locator('.dialog .dlg-foot .tb-btn.primary').click();
  await expect.poll(() => app.dernier(), { timeout: 30000 }).toContain('page recadrée');
  await app.vue('organiser');
  await page.dblclick('#pages .tile:nth-child(1)');
  await expect(page.locator('.editor')).toBeVisible();
  await page.click('.ed-tool[data-tool="box"]');
  const f = await page.locator('.ed-sheet').boundingBox();
  await page.mouse.move(f.x + f.width * 0.1, f.y + f.height * 0.1);
  await page.mouse.down(); await page.mouse.move(f.x + f.width * 0.4, f.y + f.height * 0.2, { steps: 5 }); await page.mouse.up();
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  const { octets } = await app.exporter();
  const rect = await page.evaluate(async (b64) => {
    const bin = atob(b64); const data = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
    const doc = await window.pdfjsLib.getDocument({ data }).promise;
    const p = await doc.getPage(1);
    const a = (await p.getAnnotations()).find((x) => x.subtype === 'Square');
    return { rect: a.rect, vue: p.view };
  }, Buffer.from(octets).toString('base64'));
  // le cadre est dans la zone visible, pas décalé hors de la page
  expect(rect.rect[0]).toBeGreaterThanOrEqual(rect.vue[0]);
  expect(rect.rect[2]).toBeLessThanOrEqual(rect.vue[2] + 1);
  expect(rect.rect[1]).toBeGreaterThanOrEqual(rect.vue[1]);
  expect(rect.rect[3]).toBeLessThanOrEqual(rect.vue[3] + 1);
});
