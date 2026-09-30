/**
 * Réunit la vitrine figée en UN fichier HTML.
 *
 *   npm run vitrine        # produit site/vitrine/
 *   node test/un-seul-fichier.mjs
 *
 * Douze pages, un seul fichier : le CSS et les polices ne sont écrits qu'une
 * fois au lieu de douze, les liens internes deviennent des ancres, et la
 * navigation se fait sans serveur. On peut l'envoyer par courriel, le poser sur
 * une clé, l'ouvrir sur un téléphone — il n'a besoin de rien.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DOSSIER = process.env.VITRINE ?? path.join(process.cwd(), "vitrine");
const SORTIE = process.env.FICHIER ?? path.join(process.cwd(), "vitrine", "Blonay-PDF-site.html");

const PAGES = [
  ["index", "accueil"], ["communes", "communes"], ["ecoles", "ecoles"], ["etat", "etat"],
  ["fonctionnalites", "fonctionnalites"], ["tarifs", "tarifs"], ["securite", "securite"],
  ["offre", "offre"], ["contact", "contact"], ["cgv", "cgv"],
  ["mentions-legales", "mentions-legales"], ["confidentialite", "confidentialite"],
];
const ANCRE = Object.fromEntries(PAGES.map(([f, a]) => [f + ".html", a]));

const lire = (f) => readFileSync(path.join(DOSSIER, f + ".html"), "utf8");
const premier = lire("index");

// Le CSS est le même sur toutes les pages : une seule copie suffit, et c'est
// elle qui pèse (les polices y sont intégrées en base64).
const css = [...premier.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");

// next/font déclare ses variables sur <html> ; il n'y a plus qu'un <html> ici,
// alors on les remonte sur :root pour qu'elles valent partout.
const classesHtml = /<html[^>]*class="([^"]*)"/.exec(premier)[1].split(/\s+/);
const promues = classesHtml
  .flatMap((c) => [...css.matchAll(new RegExp("\\." + c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}", "g"))])
  .map((m) => m[1].trim());
if (!promues.length) throw new Error("variables de police introuvables");

const vues = PAGES.map(([fichier, ancre]) => {
  const s = lire(fichier);
  let corps = /<body[^>]*>([\s\S]*?)<\/body>/.exec(s)[1];
  // Les liens entre pages deviennent des ancres dans le même document.
  corps = corps.replace(/href="([a-z0-9-]+\.html)"/g, (t, f) => (ANCRE[f] ? `href="#${ANCRE[f]}"` : t));
  const titre = (/<title[^>]*>([\s\S]*?)<\/title>/.exec(s)?.[1] ?? "Blonay PDF").trim();
  return `<div class="vue" id="${ancre}" data-titre="${titre.replace(/"/g, "&quot;")}" hidden>${corps}</div>`;
}).join("\n");

const doc = `<!doctype html>
<html lang="fr-CH" class="${classesHtml.join(" ")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blonay PDF — l'outil PDF des administrations publiques suisses</title>
<meta name="robots" content="noindex, nofollow">
<style>
${css}
:root { ${promues.join(" ")} }
/* Une page à la fois, choisie par l'ancre. */
.vue[hidden] { display: none; }
.vue { display: flex; min-height: 100dvh; flex-direction: column; }
</style>
</head>
<body>
${vues}
<script>
// Copie figée : pas de serveur, donc la navigation se fait ici. Chaque ancien
// lien de page est devenu une ancre ; on montre la vue correspondante.
(function () {
  var vues = document.querySelectorAll(".vue");
  function montrer() {
    var id = (location.hash || "#accueil").slice(1);
    // On cherche la vue, et pas n'importe quel élément portant cet identifiant :
    // une page du site a une section « tarifs », et getElementById tombait
    // dessus au lieu de la vue du même nom.
    var cible = null;
    for (var j = 0; j < vues.length; j++) if (vues[j].id === id) cible = vues[j];
    if (!cible) cible = document.getElementById("accueil");
    for (var i = 0; i < vues.length; i++) vues[i].hidden = vues[i] !== cible;
    document.title = cible.dataset.titre || "Blonay PDF";
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", montrer);
  montrer();
})();
</script>
</body>
</html>
`;

writeFileSync(SORTIE, doc);
console.log(`${SORTIE} — ${(doc.length / 1024 / 1024).toFixed(2)} Mo, ${PAGES.length} pages, ${promues.length} polices`);
