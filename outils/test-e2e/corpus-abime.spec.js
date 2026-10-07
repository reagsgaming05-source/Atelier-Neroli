// Un secrétariat reçoit des PDF fabriqués par n'importe quoi : copieurs, scanners, générateurs de formulaires, courriels, vieux logiciels.
// Ici, une collection de fichiers abîmés ou tordus de toutes les façons courantes (fabriqués octet par octet à partir d'un document sain —
// rien d'un vrai document de commune n'est dans le dépôt). Pour chacun, l'application doit soit l'ouvrir et en tirer ses pages, soit le
// refuser en le disant ; elle ne doit jamais lever d'exception (le scénario type l'y oblige) ni laisser la fenêtre sans réponse.
// Un fichier réparé à l'ouverture et réexporté doit en plus sortir SAIN : la barrière de format (qpdf) juge ce que l'application écrit.
const { test, expect, pdfDe } = require('./aide');

const sain = () => pdfDe([[{ x: 70, y: 700, taille: 16, texte: 'Premiere page' }], [{ x: 70, y: 700, taille: 16, texte: 'Deuxieme page' }]]);
const texte = (b) => b.toString('latin1');
const octets = (s) => Buffer.from(s, 'latin1');
// Remplacer sans changer la longueur : les décalages de la table des références restent exacts, seul le défaut voulu est introduit.
const memeLongueur = (b, motif, par) => {
  const s = texte(b);
  const m = s.match(motif);
  if (!m) throw new Error('motif introuvable : ' + motif);
  const nouveau = String(par).padEnd(m[0].length, ' ').slice(0, m[0].length);
  return octets(s.replace(m[0], nouveau));
};
const remplacer = (b, motif, par) => octets(texte(b).replace(motif, par));

// attendu : « ouvre » (n pages) ou « refuse » (un message d'erreur, rien d'ouvert).
const CAS = [
  { nom: 'table des références décalée (startxref faux)', fabrique: () => remplacer(sain(), /startxref\n\d+/, 'startxref\n7'), attendu: 'ouvre', pages: 2 },
  { nom: 'déchets avant l\'en-tête %PDF', fabrique: () => Buffer.concat([Buffer.from('X'.repeat(300) + '\n'), sain()]), attendu: 'ouvre', pages: 2 },
  { nom: 'déchets après %%EOF', fabrique: () => Buffer.concat([sain(), Buffer.alloc(2048, 0x58)]), attendu: 'ouvre', pages: 2 },
  { nom: 'téléchargement coupé avant la fin (ni table des références, ni %%EOF) : refusé, en disant pourquoi', fabrique: () => { const b = sain(); return b.subarray(0, b.length - 140); }, attendu: 'refuse' },
  { nom: '/Length d\'un flux faux', fabrique: () => memeLongueur(sain(), /\/Length \d+/, '/Length 3'), attendu: 'ouvre', pages: 2 },
  { nom: '/Count de l\'arbre des pages faux', fabrique: () => memeLongueur(sain(), /\/Count 2/, '/Count 9'), attendu: 'ouvre', pages: 2 },
  { nom: 'fins de ligne CR seul', fabrique: () => octets(texte(sain()).replace(/\n/g, '\r')), attendu: 'ouvre', pages: 2 },
  { nom: 'page sans /MediaBox', fabrique: () => memeLongueur(sain(), /\/MediaBox \[0 0 595 842\]/, ''), attendu: 'ouvre', pages: 2 },
  { nom: 'page de 2 m × 2 m', fabrique: () => pdfDe([[{ x: 70, y: 700, taille: 16, texte: 'Affiche' }]], { largeur: 5670, hauteur: 5670 }), attendu: 'ouvre', pages: 1 },
  { nom: 'référence à un objet qui n\'existe pas', fabrique: () => memeLongueur(sain(), /\/Contents \d+ 0 R/, '/Contents 9 0 R'), attendu: 'ouvre', pages: 2 },
  { nom: 'en-tête de version PDF 2.0', fabrique: () => memeLongueur(sain(), /%PDF-1\.4/, '%PDF-2.0'), attendu: 'ouvre', pages: 2 },
  { nom: 'zéro page', fabrique: () => pdfDe([]), attendu: 'refuse' },
  { nom: 'chiffrement d\'un type inconnu', fabrique: () => remplacer(sain(), /trailer\n<</, 'trailer\n<< /Encrypt << /Filter /Inconnu /V 9 /R 9 /O (x) /U (y) /P -4 >>'), attendu: 'refuse' },
  { nom: 'binaire quelconque nommé .pdf', fabrique: () => Buffer.from(Array.from({ length: 4096 }, (_, i) => (i * 131 + 7) & 255)), attendu: 'refuse' },
  { nom: 'seulement l\'en-tête', fabrique: () => Buffer.from('%PDF-1.4\n'), attendu: 'refuse' },
];

for (const cas of CAS) {
  test('fichier abîmé — ' + cas.nom, async ({ app, page }) => {
    await app.pretAvecExemple();
    const avant = await app.nbPages();
    await page.setInputFiles('#file-input', { name: 'recu.pdf', mimeType: 'application/pdf', buffer: cas.fabrique() });
    // Une réponse arrive : le document s'ajoute à la liste, ou un message d'erreur le refuse.
    await page.waitForFunction(() => {
      const noms = Array.from(document.querySelectorAll('#doc-list .doc-name')).map((e) => e.textContent);
      return noms.some((t) => t.indexOf('recu.pdf') >= 0) || document.querySelector('#toast.error, #toast.warn');
    }, null, { timeout: 60000 });
    const ouvert = await page.evaluate(() => Array.from(document.querySelectorAll('#doc-list .doc-name')).some((e) => e.textContent.indexOf('recu.pdf') >= 0));
    if (cas.attendu === 'refuse') {
      expect(ouvert, 'le fichier est refusé, pas ouvert à moitié').toBe(false);
      await expect(page.locator('#toast')).toHaveClass(/error|warn/);
      expect(await app.nbPages(), 'le document d\'avant n\'a pas bougé').toBe(avant);
      return;
    }
    expect(ouvert, 'le fichier est ouvert').toBe(true);
    await app.attendreRendu();
    expect(await app.nbPages()).toBe(cas.pages);
    // Réparé, il ressort sain : la barrière de format (qpdf) juge l'export.
    const { octets: sortie } = await app.exporter();
    expect(sortie.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
}
