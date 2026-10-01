// La vérification des licences côté site doit dire la même chose que l'application : on
// signe avec l'outil de l'éditeur (outils/editeur/emettre-licence.js), on vérifie avec le
// code du site. Si les deux divergent un jour — canonisation, clé, champs — ce test tombe.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, generateKeyPairSync } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

// `server-only` refuse d'être importé hors d'un composant serveur : on le neutralise pour le test.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require("node:module");
const origine = Module._load;
Module._load = function (request: string, ...reste: unknown[]) {
  if (request === "server-only") return {};
  return origine.call(this, request, ...reste);
};

const outils = path.resolve(__dirname, "..", "..", "outils");

function emettre(args: string[], dossierCles: string) {
  const sortie = fs.mkdtempSync(path.join(os.tmpdir(), "licence-site-"));
  execFileSync(process.execPath, [path.join(outils, "editeur", "emettre-licence.js"), ...args, "--cle", path.join(dossierCles, "licence-essai.pem")], {
    cwd: sortie,
    env: { ...process.env, BLONAY_CLES_PUBLIQUES_ESSAI: fs.readFileSync(path.join(dossierCles, "publiques.json"), "utf8") },
    stdio: "pipe",
  });
  const f = fs.readdirSync(sortie).find((n) => n.endsWith(".licence.json"))!;
  return fs.readFileSync(path.join(sortie, f), "utf8");
}

function cles() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "cles-site-"));
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  fs.writeFileSync(path.join(d, "licence-essai.pem"), privateKey.export({ format: "pem", type: "pkcs8" }));
  const brute = publicKey.export({ format: "der", type: "spki" }).subarray(12).toString("base64");
  const publiques = { maj: [], licence: [{ id: "licence-essai", cle: brute }] };
  fs.writeFileSync(path.join(d, "publiques.json"), JSON.stringify(publiques));
  return { dossier: d, ks: publiques.licence };
}

test("une licence émise par l'outil de l'éditeur est acceptée par le site", async () => {
  const { lireLicence } = await import("../src/lib/licences");
  const k = cles();
  const corps = emettre(["--client", "Commune d'Essai", "--ide", "CHE-000.000.000", "--postes", "10", "--id", "BLP-2026-0042"], k.dossier);
  const r = lireLicence(corps, k.ks);
  assert.equal(r.ok, true, r.ok ? "" : r.raison);
  if (r.ok) {
    assert.equal(r.piece.client, "Commune d'Essai");
    assert.equal(r.piece.postes, 10);
    assert.equal(r.piece.id, "BLP-2026-0042");
  }
});

test("réindentée par un éditeur de texte, elle reste valide", async () => {
  const { lireLicence } = await import("../src/lib/licences");
  const k = cles();
  const corps = emettre(["--client", "Commune d'Essai", "--postes", "1"], k.dossier);
  assert.equal(lireLicence(JSON.stringify(JSON.parse(corps), null, 8), k.ks).ok, true);
});

test("400 postes au lieu de 10, la ligne sig retirée, une autre clé : refusés avec la raison", async () => {
  const { lireLicence } = await import("../src/lib/licences");
  const k = cles();
  const corps = JSON.parse(emettre(["--client", "Commune d'Essai", "--postes", "10"], k.dossier));
  const gonflee = { ...corps, postes: 400 };
  const a = lireLicence(JSON.stringify(gonflee), k.ks);
  assert.equal(a.ok, false);
  if (!a.ok) assert.match(a.raison, /signature ne correspond pas/);
  const { sig: _sig, ...sansSig } = corps;
  const b = lireLicence(JSON.stringify(sansSig), k.ks);
  assert.equal(b.ok, false);
  if (!b.ok) assert.match(b.raison, /pas signé/);
  const autre = cles();
  const c = lireLicence(JSON.stringify(corps), autre.ks.map((x) => ({ ...x, id: corps.cle })));
  assert.equal(c.ok, false);
  const d = lireLicence(JSON.stringify(corps), []);
  assert.equal(d.ok, false);
  if (!d.ok) assert.match(d.raison, /Aucune clé publique/);
});

test("un modèle « interne » (un service qui ne paie pas) est émis sans échéance", async () => {
  const { lireLicence } = await import("../src/lib/licences");
  const k = cles();
  const r = lireLicence(emettre(["--client", "Service interne", "--modele", "interne"], k.dossier), k.ks);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.piece.majJusqu, "");
});

test("ce n'est pas du JSON, ou pas une licence : refusé net", async () => {
  const { lireLicence } = await import("../src/lib/licences");
  assert.equal(lireLicence("pas du json", []).ok, false);
  assert.equal(lireLicence(JSON.stringify({ v: 1, objet: "maj", sig: "x" }), [{ id: "a", cle: "AA==" }]).ok, false);
  void createHash;
});
