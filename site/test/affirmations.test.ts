/**
 * Les promesses que ce site a déjà faites et que le logiciel ne tenait pas.
 *
 * Un audit en a relevé cent six : un service en nuage qui n'existe pas, un
 * caviardage « définitif » qui ne l'était pas, des normes que le logiciel ne
 * produit pas, un vendeur inventé. Chacune a été retirée ; ce test empêche
 * qu'elle revienne, par une retouche de texte ou un copier-coller.
 *
 * Si l'une de ces formulations devient vraie un jour — le logiciel produit un
 * jour du PDF/A —, c'est la ligne de ce test qu'on retire, dans le même commit
 * que la fonction, et pas avant.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const RACINE = path.join(process.cwd(), "src");

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = path.join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(ts|tsx)$/.test(nom) ? [chemin] : [];
  });
}

/** [motif, pourquoi c'est faux, strict]. Hors « strict », une ligne qui nie la fonction (« ni », « pas de », « aucun ») est honnête. */
const INTERDITES: [RegExp, string, boolean?][] = [
  [/caviard\w*[^.\n]{0,60}(définitiv|irréversib)|(définitiv|irréversib)[^.\n]{0,60}caviard/i, "le caviardage est celui du texte de la page, pas « définitif »"],
  [/sortent? définitivement|retire réellement le contenu du fichier|supprim\w+ de façon irréversible/i, "faux pour les métadonnées, les commentaires et les champs"],
  [/hébergé(e|s)? en suisse|hébergement en suisse|serveurs? (situés )?en suisse/i, "il n'y a aucun serveur de traitement"],
  [/ISO ?27001|TLS 1\.3|clés? (sont )?gérées? séparément/i, "aucun service en ligne ne les justifie"],
  [/99[.,]5 ?%/, "aucun service en ligne, aucune mesure de disponibilité"],
  [/supprim\w+ (automatiquement )?(après|sous) 24|traités en ligne|fichiers stockés|espace de stockage|espace documentaire/i, "rien n'est envoyé ni stocké"],
  [/synchronisation entre appareils|lien de relecture|réponses centralisées|réponses exportées/i, "n'existe pas"],
  [/connexion unique|identité cantonale|authentification à deux facteurs|authentification unique/i, "n'existe pas"],
  [/30 langues|plus de trente langues/i, "deux langues : français et allemand"],
  [/PDF\/UA|PDF\/X/i, "le logiciel ne produit ni l'un ni l'autre"],
  [/horodat|certificat d'audit|journal d'audit|rappels? automatique|ordre de signature|envoi groupé/i, "aucune signature électronique n'existe dans le logiciel"],
  [/motifs? prédéfinis|rapport de vérification|numéro AVS caviardé|motif : numéro AVS/i, "aucun motif ni rapport dans le logiciel"],
  [/détection automatique (des|repère)|y compris scannés/i, "le logiciel ne détecte pas les champs d'un scan"],
  [/plus de \d+ langues|word, excel, powerpoint, jpg|conversion par lots|convertir dans les deux sens|documents office/i, "aucune conversion bureautique"],
  [/division par signets|par signets ou par taille|table des matières générée automatiquement/i, "n'existe pas dans la fusion ni la division"],
  [/jusqu'à 90 ?%|polices et le texte restent vectoriels|compresser sans perte|aperçu avant ?\/ ?après/i, "la réduction convertit les pages en images"],
  [/annuler ?\/ ?rétablir illimité/i, "soixante états"],
  [/douze outils|12 outils|les 12 outils/i, "le panneau compte vingt-six outils"],
  [/témoignage à recueillir|fondée en 2021|CHE-000|aktumpdf\.ch|route de vevey|\+41 ?21 ?943|linkedin\.com/i, "donnée inventée", true],
  [/\bsàrl\b/i, "aucune société n'est constituée", true],
  [/sous (24|48|deux|2) ?(h|heures|jours)|24 h ouvrées|deux jours ouvrables|48 heures/i, "aucun délai de réponse n'est tenable sans courriel branché", true],
  [/déjà écrites|les pièces sont prêtes|dossier de marché public fourni|clause de réversibilité (et|figurent)|contrat de sous-traitance (LPD|conforme|fourni)|attestation de conformité/i, "ces pièces n'existent pas"],
  [/accompagnement rodé|conforme (à la )?lpd|conformité lpd|conforme aux exigences de la lprd/i, "aucune conformité n'est certifiée"],
  [/clé de licence|console de déploiement/i, "le logiciel n'a aucune notion de clé de licence"],
  [/dans les écoles|ce que les établissements retiennent/i, "parle au passé d'un produit sans client"],
];

const NEGATION = /\bni\b|\bpas\b|\baucun|n'existe|ne fait|ne produit|sans /i;

for (const fichier of fichiers(RACINE)) {
  if (fichier.endsWith("affirmations.test.ts")) continue;
  const lignes = readFileSync(fichier, "utf8").split("\n");
  lignes.forEach((ligne, i) => {
    // Les commentaires de code expliquent ce qu'on a retiré : on ne les juge pas.
    if (/^\s*(\/\/|\*|\/\*)/.test(ligne)) return;
    for (const [motif, pourquoi, strict] of INTERDITES) {
      if (motif.test(ligne) && (strict || !NEGATION.test(ligne))) {
        test(`${path.relative(RACINE, fichier)}:${i + 1} n'affirme pas « ${motif.exec(ligne)?.[0]} »`, () => {
          assert.fail(`${pourquoi}\n  ${ligne.trim().slice(0, 200)}`);
        });
      }
    }
  });
}

test("aucune formulation interdite n'est revenue", () => {
  assert.ok(true);
});
