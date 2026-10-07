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
import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EXE = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SORTIE = process.env.SORTIE ?? path.join(process.cwd(), "vitrine");
const DATE_FIGEAGE = new Date().toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" });

/** Les pages publiques, et le nom de fichier que chacune prend. */
const PAGES = [
  ["/", "index"],
  ["/communes", "communes"],
  ["/ecoles", "ecoles"],
  ["/etat", "etat"],
  ["/fonctionnalites", "fonctionnalites"],
  ["/tarifs", "tarifs"],
  ["/securite", "securite"],
  ["/telecharger", "telecharger"],
  ["/offre", "offre"],
  ["/contact", "contact"],
  ["/cgv", "cgv"],
  ["/limites", "limites"],
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

  // Les captures de l'application (public/captures/) voyagent dans la page, en base64 : la vitrine n'a ni serveur ni dossier d'images.
  const srcs = await page.$$eval('img[src^="/captures/"]', (l) => [...new Set(l.map((x) => x.getAttribute("src")))]);
  const images = {};
  for (const s of srcs) images[s] = "data:image/png;base64," + Buffer.from(await (await page.request.get(BASE + s)).body()).toString("base64");

  const html = await page.evaluate(
    ([styles, carte, svg, imgs, dateFigee]) => {
      const d = document.cloneNode(true);
      // Sans serveur, le JavaScript de Next ne ferait que produire des erreurs.
      d.querySelectorAll("script, link").forEach((n) => n.remove());
      d.querySelectorAll('img[src^="/captures/"]').forEach((i) => { const v = imgs[i.getAttribute("src")]; if (v) i.setAttribute("src", v); i.removeAttribute("loading"); });
      const s = d.createElement("style");
      s.textContent = styles;
      d.head.appendChild(s);
      const ico = d.createElement("link");
      ico.rel = "icon";
      ico.href = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
      d.head.appendChild(ico);
      // Un lien vers une page que la vitrine ne contient pas (la démo, la
      // connexion, l'espace client) ne doit pas renvoyer à l'accueil en
      // faisant croire qu'il marche : il devient un élément inerte qui le dit.
      d.querySelectorAll("a[href]").forEach((a) => {
        const h = a.getAttribute("href");
        if (!h || !h.startsWith("/")) return;
        // Le texte des licences des polices voyage à côté des pages (voir plus bas) : le lien reste un lien.
        if (h === "/licences-polices.txt") { a.setAttribute("href", "licences-polices.txt"); return; }
        const cible = carte[h.split("?")[0].split("#")[0]];
        if (cible) {
          a.setAttribute("href", (cible === "index" ? "index.html" : cible + ".html") + (h.includes("#") ? "#" + h.split("#")[1] : ""));
          return;
        }
        a.removeAttribute("href");
        a.setAttribute("aria-disabled", "true");
        a.setAttribute("title", "Disponible sur le site en ligne, pas dans cette présentation");
        a.classList.add("lien-vitrine-inerte");
        a.style.opacity = "0.55";
        a.style.cursor = "not-allowed";
        a.style.pointerEvents = "auto";
      });
      // Les formulaires restent visibles, mais n'envoient nulle part : on le
      // dit au-dessus, et le bouton d'envoi est désactivé. Un formulaire qui
      // accepte la saisie puis ne fait rien est la pire des impasses.
      d.querySelectorAll("form").forEach((f) => {
        f.removeAttribute("action");
        f.querySelectorAll('button[type="submit"], button:not([type]), input[type="submit"]').forEach((b) => {
          b.setAttribute("disabled", "");
          b.style.opacity = "0.55";
          b.style.cursor = "not-allowed";
        });
        const note = d.createElement("p");
        note.setAttribute("role", "note");
        note.setAttribute("style", "margin:0 0 16px;padding:12px 16px;border-radius:12px;background:#fff6dd;color:#5a4300;font-size:14px;line-height:1.5");
        note.textContent = "Cette présentation n'envoie rien : le formulaire fonctionne sur le site en ligne, pas ici.";
        f.parentNode.insertBefore(note, f);
      });
      // La date à laquelle cette présentation a été figée : un lecteur qui la trouve sur une clé USB doit savoir de quand elle date.
      const fige = d.createElement("p");
      fige.setAttribute("role", "note");
      fige.setAttribute("style", "margin:0;padding:14px 16px;text-align:center;font-size:13px;color:#555;border-top:1px solid #ddd");
      fige.textContent = "Présentation figée le " + dateFigee + ". Le site en ligne peut avoir changé depuis.";
      d.body.appendChild(fige);
      return "<!doctype html>\n" + d.documentElement.outerHTML;
    },
    [css, NOMS, icone, images, DATE_FIGEAGE],
  );

  writeFileSync(path.join(SORTIE, `${nom}.html`), html);
  console.log(`  ${nom}.html  ${(html.length / 1024).toFixed(0)} Ko`);
}

console.log(`${PAGES.length} pages dans ${SORTIE} — ${polices.size} polices intégrées.`);
copyFileSync(path.join(process.cwd(), "public", "licences-polices.txt"), path.join(SORTIE, "licences-polices.txt"));
await navigateur.close();
