/**
 * Le parcours d'achat d'une collectivité, joué en entier dans un navigateur.
 *
 *   npm run dev          # dans un terminal
 *   npm run e2e          # dans un autre
 *
 * C'est le chemin par lequel l'argent arrive : une commune demande une offre,
 * nous la chiffrons, elle l'accepte avec son bon de commande, la facture part
 * avec sa QR-facture. Chacune de ces étapes touche la base de données et une
 * transaction ; une relecture ne suffit pas à garantir qu'elles s'enchaînent.
 *
 * Ce qu'on vérifie surtout, à la fin : que le code QR de la facture contient
 * bien une charge utile QR-facture valide, avec le bon montant et la bonne
 * référence. Une facture jolie mais illisible par la banque ne sert à rien.
 */
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EXE = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const ADMIN = { email: process.env.ADMIN_EMAIL ?? "admin@blonaypdf.ch", password: process.env.ADMIN_PASSWORD ?? "BlonayPDF-Admin-2026!" };

const marque = Date.now().toString(36);
const COMMUNE = `Commune d'essai ${marque}`;
const EMAIL = `greffe.${marque}@exemple.ch`;
const MOT_DE_PASSE = "Essai-2026!";
const BON_DE_COMMANDE = `BC-${marque}`;

const dit = (quoi) => console.log("  " + quoi);

const navigateur = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const erreurs = [];

try {
  /* 1. La commune demande une offre, sans compte. ------------------------- */
  const visiteur = await navigateur.newContext();
  const p = await visiteur.newPage();
  p.on("pageerror", (e) => erreurs.push("JS: " + e.message));

  await p.goto(`${BASE}/offre?type=commune`, { waitUntil: "networkidle" });
  await p.fill("#orgName", COMMUNE);
  await p.fill("#orgIde", "CHE-000.000.000");
  await p.fill("#street", "Place de l'Exemple 1");
  await p.fill("#zip", "1000");
  await p.fill("#city", "Localité");
  await p.fill("#seats", "14");
  await p.selectOption("#planSlug", "administration");
  await p.fill("#contactFirstName", "Prénom");
  await p.fill("#contactLastName", "Nom");
  await p.fill("#contactRole", "Secrétaire municipal·e");
  await p.fill("#contactEmail", EMAIL);
  await p.fill("#message", "Passage en Municipalité le mois prochain.");
  await p.click('button[type="submit"]');
  await p.waitForSelector("text=Demande enregistrée", { timeout: 20000 });
  const accuse = await p.textContent(".card");
  const numeroOffre = accuse.match(/OF-\d{4}-\d{4}/)?.[0];
  assert.ok(numeroOffre, "la demande doit rendre un numéro d'offre");
  dit(`demande déposée sans compte : ${numeroOffre}`);

  /* 2. L'administration la chiffre et l'ouvre. ---------------------------- */
  const bureau = await navigateur.newContext();
  const a = await bureau.newPage();
  a.on("pageerror", (e) => erreurs.push("JS admin: " + e.message));

  await a.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
  await a.fill("#email", ADMIN.email);
  await a.fill("#password", ADMIN.password);
  await a.click('button[type="submit"]');
  await a.waitForURL(/\/(admin|compte)/, { timeout: 20000 });

  await a.goto(`${BASE}/admin/offres`, { waitUntil: "networkidle" });
  const carte = a.locator("article.card", { hasText: COMMUNE });
  await carte.waitFor({ timeout: 20000 });
  assert.ok((await a.textContent("body")).includes("14 postes"), "le nombre de postes remonte à l'administration");
  await carte.locator("#amount").fill("1990.00");
  await carte.locator('button[type="submit"]').click();
  // La carte quitte la liste « à chiffrer » : c'est la page, et non le
  // formulaire démonté avec elle, qui doit montrer le lien à transmettre.
  await a.waitForURL(/\/admin\/offres\?envoyee=/, { timeout: 20000 });
  await a.waitForSelector("text=Transmettez ce lien", { timeout: 20000 });
  const lien = (await a.locator("p.font-mono").first().textContent()).trim();
  assert.match(lien, /^\/offre\/[A-Za-z0-9_-]{20,}$/, "l'administration reçoit un lien à transmettre");
  dit(`offre chiffrée à CHF 1990.00, lien prêt : ${lien.slice(0, 18)}…`);

  /* 3. La commune ouvre l'offre et l'accepte avec son bon de commande. ---- */
  await p.goto(BASE + lien, { waitUntil: "networkidle" });
  const devis = await p.textContent("article.card");
  assert.ok(devis.includes(COMMUNE), "le devis est nominatif");
  // Le site écrit les montants à la suisse : CHF 1’990.– (apostrophe typographique).
  assert.ok(devis.includes("CHF 1\u2019990.\u2013"), `le devis porte le montant — lu : ${devis.match(/CHF[^ ]* ?[^\s]*/)?.[0]}`);
  assert.ok(devis.includes("Administration"), "le devis porte la formule");
  dit("devis consultable sans connexion, nominatif et chiffré");

  await p.fill("#purchaseOrder", BON_DE_COMMANDE);
  await p.fill("#password", MOT_DE_PASSE);
  await p.click('button[type="submit"]');
  await p.waitForURL(/\/compte\/factures\//, { timeout: 30000 });
  dit("offre acceptée : compte créé, abonnement ouvert, facture émise");

  /* 4. La facture porte une QR-facture lisible. --------------------------- */
  const facture = await p.textContent("body");
  assert.ok(facture.includes("Commande enregistrée"), "la commande est confirmée");
  assert.ok(facture.includes(BON_DE_COMMANDE), "le bon de commande figure sur la facture");
  assert.ok(facture.includes("À payer"), "la facture est ouverte, pas encaissée");
  assert.ok(facture.includes("Section paiement"), "la section paiement est présente");
  assert.ok(facture.includes("Récépissé"), "le récépissé aussi");

  const bulletin = p.locator(".qr-bulletin");
  await bulletin.waitFor({ timeout: 10000 });
  const codeQr = bulletin.locator("svg[role='img']");
  assert.equal(await codeQr.count(), 1, "un seul code QR sur la section paiement");

  // Les dimensions normatives : 46 mm pour le code, 210 × 105 mm pour la feuille.
  assert.equal(await codeQr.getAttribute("width"), "46mm");
  const boite = await bulletin.boundingBox();
  const mm = boite.width / 210;
  assert.ok(Math.abs(boite.height / mm - 105) < 1.5, `hauteur attendue 105 mm, obtenue ${(boite.height / mm).toFixed(1)} mm`);
  dit(`section paiement aux dimensions de la norme : 210 × ${(boite.height / mm).toFixed(0)} mm, code QR de 46 mm`);

  /* 4b. Et surtout : le code QR se lit. ---------------------------------- */
  // Le reste ne vaut rien si la banque ne sait pas scanner ce carré. On le
  // rasterise dans la page et on le décode avec un lecteur indépendant, comme
  // le ferait l'application e-banking d'une boursière communale. C'est la
  // croix suisse posée au centre qui fait courir le risque : elle mange des
  // modules, et seule la redondance du niveau M permet de les retrouver.
  const jsqr = readFileSync(createRequire(import.meta.url).resolve("jsqr/dist/jsQR.js"), "utf8");
  const svg = await codeQr.evaluate((n) => n.outerHTML);
  const decode = await p.evaluate(
    async ([source, markup]) => {
      const mod = new Function("module", "exports", source + "\nreturn module.exports;")({ exports: {} }, {});
      const jsQR = mod.default ?? mod;
      const cote = 900; // bien au-delà des 46 mm imprimés : on ne teste pas la résolution
      // Les millimètres du document imprimé n'ont pas de sens pour un canvas :
      // on redimensionne en pixels avant de rasteriser.
      const enPixels = markup
        .replace(/width="[^"]*"/, `width="${cote}"`)
        .replace(/height="[^"]*"/, `height="${cote}"`);
      const img = new Image();
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(enPixels)));
      await img.decode();
      const c = document.createElement("canvas");
      c.width = c.height = cote;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, cote, cote);
      ctx.drawImage(img, 0, 0, cote, cote);
      const d = ctx.getImageData(0, 0, cote, cote);
      return jsQR(d.data, cote, cote)?.data ?? null;
    },
    [jsqr, svg],
  );
  assert.ok(decode, "le code QR doit être décodable malgré la croix suisse posée au centre");

  const lignes = decode.split("\r\n");
  assert.equal(lignes[0], "SPC", "en-tête de charge utile QR-facture");
  assert.equal(lignes[1], "0200", "version de charge utile");
  assert.equal(lignes[3], "CH9300762011623852957", "IBAN du créancier");
  assert.equal(lignes[18], "1990.00", "montant");
  assert.equal(lignes[19], "CHF", "monnaie");
  assert.equal(lignes[21], COMMUNE, "débiteur");
  assert.equal(lignes[27], "SCOR", "type de référence");
  assert.match(lignes[28], /^RF\d{2}/, "référence créancier");
  assert.ok(lignes.includes("EPD"), "fin des données de paiement");
  assert.ok(decode.includes(BON_DE_COMMANDE), "le bon de commande voyage dans le code QR");
  dit(`code QR décodé : ${lignes.length} lignes, ${lignes[18]} ${lignes[19]}, réf. ${lignes[28].slice(0, 8)}…`);

  const texteBulletin = await bulletin.textContent();
  assert.ok(texteBulletin.includes("CH93"), "l'IBAN figure sur la section paiement");
  assert.ok(texteBulletin.includes(COMMUNE), "le débiteur est la commune");
  assert.ok(texteBulletin.includes("1990.00"), "le montant est celui de l'offre");
  assert.ok(/RF\d{2}/.test(texteBulletin), "la référence créancier est imprimée");
  dit("QR-facture : IBAN, débiteur, montant et référence structurée");

  /* 5. Et le tout se retrouve dans l'espace client. ----------------------- */
  await p.goto(`${BASE}/compte/factures`, { waitUntil: "networkidle" });
  assert.ok((await p.textContent("body")).includes("AN-"), "la facture est listée dans l'espace client");
  dit("facture retrouvée dans l'espace client");

  /* 6. L'administration voit la commande et peut pointer l'encaissement. -- */
  await a.goto(`${BASE}/admin/offres`, { waitUntil: "networkidle" });
  const suivi = await a.textContent("body");
  assert.ok(suivi.includes("Acceptée"), "l'offre passe en « acceptée »");
  assert.ok(suivi.includes(BON_DE_COMMANDE), "le bon de commande remonte au suivi");
  dit("suivi à jour côté administration");

  if (erreurs.length) throw new Error("Erreurs JavaScript :\n" + [...new Set(erreurs)].join("\n"));
  console.log("PARCOURS OK");
} finally {
  await navigateur.close();
}
