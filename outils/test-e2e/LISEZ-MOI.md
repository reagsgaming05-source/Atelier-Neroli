# La suite de bout en bout

L'application entière, pilotée dans Chromium, sur la page hors ligne (`outils/aktum-pdf-hors-ligne.html`, celle que l'application de bureau
embarque) : aucun accès réseau, donc un résultat qui ne dépend que du code du dépôt.

```
cd outils && npm ci && npm run libs && npm run build      # la page construite n'est pas versionnée
cd test-e2e && npm ci && npx playwright install chromium
npx playwright test                                        # toute la suite, ≈ 11 minutes
npx playwright test poste.spec.js                          # un fichier
```

Les scénarios qui jugent le fichier produit avec des outils qui ne sont pas les nôtres demandent `qpdf`, `poppler-utils` (pdftotext), `python3` +
`pikepdf` et, pour l'archivage, `veraPDF` (variable `VERAPDF`). En CI ils sont installés, et leur absence fait **échouer** (jamais passer sous
silence). Sur un poste de développement sans eux, les scénarios concernés se mettent de côté.

## Ce que la suite garde

| Garde | Où | Ce qu'elle refuse |
| --- | --- | --- |
| **Barrière de format** | `aide.js` › `recolter()` | tout PDF produit par un scénario qui n'est pas sain pour `qpdf --check` (code ≠ 0, avertissements compris). Les scénarios relisent aussi les fichiers avec le pdf.js de la page — juge et partie ; qpdf est un autre lecteur. |
| **Aucun scénario sans affirmation** | `aide.js` › fixture `garde` | un scénario qui réussit sans un seul `expect` (il passerait quoi qu'il arrive). |
| **Aucune exception dans la page** | `aide.js` › fixture `app` | toute exception JavaScript non rattrapée pendant un scénario. |
| **Aucune connexion** | `socle.spec.js`, `desktop/reseau-test.js` | la moindre requête `http(s)` de la page, de l'application de bureau. |
| **Fichiers abîmés** | `corpus-abime.spec.js` | une exception, un blocage ou un export abîmé sur 15 fichiers tordus de façons courantes (table des références décalée, fin coupée, `/Length` faux, page sans `/MediaBox`, contenu qui renvoie à un objet absent…). |
| **Rendu** | `visuel.spec.js` + `references/` | une différence d'un octet sur six captures de référence (le rendu est reproductible : même navigateur, même octet). À refaire quand Playwright change de Chromium. |
| **Temps** | `perf.spec.js`, `memoire.spec.js` | une recherche sur 300 pages, l'export de 100 pages, un dossier de 10 pièces, la mémoire des aperçus, au-delà d'un plafond large. |
| **Corriger un texte** | `modifier-texte.spec.js`, `fixtures/texte/` | un nouveau texte qu'on ne lit pas, un ancien qu'on lit encore (à l'écran, au copier-coller, dans les octets), un mot d'à côté qui bouge, un mot qui en recouvre un autre, un point du rendu qui change hors de la zone — jugés par poppler et qpdf sur des PDF de LibreOffice, Chromium, Ghostscript, Cairo, reportlab, une page tournée et un scan à texte caché |
| **Chiffrement** | `protection.spec.js`, `lots.spec.js` | un mot de passe annoncé qui n'est pas dans les octets (`/Encrypt`), jugé par qpdf. |

Ces gardes se règlent dans `aide.js`. `AKTUM_SANS_VERIFICATEURS=1` (poste Windows de la CI, sans qpdf ni poppler) met la barrière de format de
côté et laisse de côté les fichiers de scénarios qui exigent ces outils (ou, pour `visuel.spec.js`, les références d'image faites avec le Chromium de Linux : le dessin des polices y diffère de 0,6 % des pixels sous Windows) (`playwright.config.js`) : ils ont déjà joué sur Linux.

## La couverture : ce qu'elle dit, et ce qu'elle ne dit pas

```
npm run couverture            # joue toute la suite avec relevé, puis rapporte (couverture/RAPPORT.md, non versionné)
node couverture.js --rapport  # rapporte seulement, d'après le dernier relevé
```

Le navigateur dit quelles plages du programme de la page ont été exécutées ; `couverture.js` les additionne sur tous les scénarios et les rapporte aux
modules de `outils/src/`. Le chiffre est la part des « jetons » du code (hors blancs et commentaires) exécutés au moins une fois.

**Relevé du 7 octobre 2026 : 77,2 % du code de la page, sur 63 modules** (432 relevés, un par scénario). Les trois modules les moins couverts —
`61-glisser.js`, `60-livraison.js` (enregistrer sur place, travail mis de côté), `58-licence.js` — sont ceux qui ne servent que dans l'application de
bureau : leurs chemins sont éprouvés par `desktop/smoke-test.js`, `glisser-test.js` et `licence-test.js`, que ce relevé ne voit pas.

À citer avec sa réserve, jamais seul : exécuter une ligne n'est pas la vérifier ; c'est une borne **haute** de ce que les scénarios prouvent. Il ne dit
rien de `outils/desktop/` (le processus principal d'Electron).

## Les instabilités connues

Trois scénarios de la suite complète (`correction-flux`, `menus-onglets`, `word`) ont échoué une fois sur la machine de développement sous forte charge
(trois navigateurs et d'autres commandes en parallèle) et passent seuls, 24 fois sur 24. En CI, une nouvelle tentative est permise sauf pour une version
stable (`playwright.config.js`) : un test instable qui passe au deuxième essai ne doit pas laisser partir ce que les postes téléchargent.
