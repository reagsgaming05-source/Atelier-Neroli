/**
 * Fige le site public en pages autonomes, à partager sans hébergeur.
 *
 *   npm run dev        # dans un terminal
 *   npm run vitrine    # dans un autre
 *
 * Chaque page sort en un seul fichier HTML qui tient tout seul : le CSS est
 * intégré, les polices sont glissées dedans en base64, les liens internes
 * deviennent des fichiers voisins. Aucun serveur, aucun script, aucune requête
 * sortante — le dossier s'ouvre par un double-clic, se met sur une clé USB ou
 * se publie tel quel.
 *
 * Ce n'est que la vitrine : les formulaires s'affichent mais n'envoient rien,
 * et l'espace client comme l'administration ont besoin de la vraie application.
 * Pour montrer le site à quelqu'un avant de l'avoir mis en ligne, cela suffit.
 */
import { chromium } from "playwright-core";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EXE = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SORTIE = process.env.SORTIE ?? path.join(process.cwd(), "vitrine");

/** Les pages publiques, et le nom de fichier que chacune prend. */
const PAGES = [
  ["/", "index"],
  ["/communes", "communes"],
  ["/ecoles", "ecoles"],
  ["/etat", "etat"],
  ["/fonctionnalites", "fonctionnalites"],
  ["/tarifs", "tarifs"],
  ["/securite", "securite"],
  ["/offre", "offre"],
  ["/contact", "contact"],
  ["/cgv", "cgv"],
  ["/mentions-legales", "mentions-legales"],
  ["/confidentialite", "confidentialite"],
];
const NOMS = Object.fromEntries(PAGES);

mkdirSync(SORTIE, { recursive: true });
const navigateur = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const page = await navigateur.newPage({ viewport: { width: 1440, height: 1200 } });

const polices = new Map();
let icone = "";

for (const [url, nom] of PAGES) {
  await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(700);

  // Le CSS est servi en morceaux ; on les réunit et on y intègre les polices.
  const feuilles = await page.$$eval('link[rel="stylesheet"]', (l) => l.map((x) => x.href));
  let css = "";
  for (const f of feuilles) {
    let t = await (await page.request.get(f)).text();
    // Les guillemets autour de l'URL sont facultatifs en CSS : n'en attraper
    // qu'une forme laisserait les polices dehors, et la page retomberait sur
    // celle du système sans rien signaler.
    for (const m of t.matchAll(/url\((["']?)([^)"']+\.woff2)\1\)/g)) {
      const absolu = new URL(m[2], f).toString();
      if (!polices.has(absolu)) {
        polices.set(absolu, Buffer.from(await (await page.request.get(absolu)).body()).toString("base64"));
      }
      t = t.split(m[0]).join(`url(data:font/woff2;base64,${polices.get(absolu)})`);
    }
    css += t + "\n";
  }
  if (!icone) icone = await (await page.request.get(BASE + "/icon.svg")).text();

  const html = await page.evaluate(
    ([styles, carte, svg]) => {
      const d = document.cloneNode(true);
      // Sans serveur, le JavaScript de Next ne ferait que produire des erreurs.
      d.querySelectorAll("script, link").forEach((n) => n.remove());
      const s = d.createElement("style");
      s.textContent = styles;
      d.head.appendChild(s);
      const ico = d.createElement("link");
      ico.rel = "icon";
      ico.href = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
      d.head.appendChild(ico);
      d.querySelectorAll("a[href]").forEach((a) => {
        const h = a.getAttribute("href");
        if (!h || !h.startsWith("/")) return;
        const cible = carte[h.split("?")[0].split("#")[0]];
        a.setAttribute("href", cible ? (cible === "index" ? "index.html" : cible + ".html") : "index.html");
      });
      // Les formulaires restent visibles, mais n'envoient nulle part.
      d.querySelectorAll("form").forEach((f) => f.removeAttribute("action"));
      return "<!doctype html>\n" + d.documentElement.outerHTML;
    },
    [css, NOMS, icone],
  );

  writeFileSync(path.join(SORTIE, `${nom}.html`), html);
  console.log(`  ${nom}.html  ${(html.length / 1024).toFixed(0)} Ko`);
}

console.log(`${PAGES.length} pages dans ${SORTIE} — ${polices.size} polices intégrées.`);
await navigateur.close();
