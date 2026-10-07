/**
 * Les captures de l'application que le site montre (public/captures/) : prises sur l'application elle-même, par le script du mode d'emploi
 * (outils/guide/captures.js), sur son document d'exemple fictif. Rien n'est dessiné ni retouché.
 *
 *   npm run captures          # sur un poste avec écran, ou : xvfb-run -a npm run captures
 *
 * Après un changement de l'interface, on relance cette commande puis « npm run vitrine » : les captures du site ne vieillissent pas dans un coin.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const RACINE = process.cwd();
const tmp = mkdtempSync(path.join(tmpdir(), "aktum-site-captures-"));
execFileSync(process.execPath, [path.join(RACINE, "..", "outils", "guide", "captures.js"), tmp], { stdio: "inherit" });
const sortie = path.join(RACINE, "public", "captures");
mkdirSync(sortie, { recursive: true });
// capture du mode d'emploi → nom du site
const prises = { "a2-lire": "lire", "a5-organiser": "organiser", "a14-dossier": "dossier", "a9-corriger-texte": "corriger", "a13-tableau": "tableau", "a12-proteger": "proteger" };
for (const [de, vers] of Object.entries(prises)) copyFileSync(path.join(tmp, de + ".png"), path.join(sortie, vers + ".png"));
console.log(Object.keys(prises).length + " captures dans " + sortie);
