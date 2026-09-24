# Blonay PDF — site et espace client

Site de vente et espace client pour **Blonay PDF**, l'outil PDF complet (éditer, fusionner, convertir, signer, caviarder, annoter) destiné aux **communes, aux établissements scolaires et aux services de l'État**.

Le site suit le vrai chemin d'achat d'une collectivité publique : elle **demande une offre**, la fait valider, **accepte avec son bon de commande**, et reçoit une **facture à 30 jours avec QR-facture suisse**. La carte bancaire reste possible pour qui peut décider seul — mais elle n'est pas le chemin principal, parce qu'une commune n'en a pas.

Tout fonctionne **en local**, sans service externe : base SQLite dans un fichier, paiement par carte en mode démonstration.

## Démarrage rapide

Prérequis : Node.js 20.9 ou plus récent.

```bash
npm install
npm run dev
```

Puis ouvrir <http://localhost:3000>.

Au premier lancement, la base de données est créée automatiquement (`data/blonay-pdf.db`), les formules sont insérées et deux comptes de démonstration sont créés.

### Comptes de démonstration

| Rôle | E-mail | Mot de passe | Accès |
| --- | --- | --- | --- |
| Administration | `admin@blonaypdf.ch` | `BlonayPDF-Admin-2026!` | <http://localhost:3000/admin> |
| Client (formule Administration, 2 collaborateurs, historique d'usage) | `marie.demo@exemple.ch` | `Demo-1234!` | <http://localhost:3000/compte> |
| Collaborateur rattaché au compte | `paul.martin@exemple.ch` | `Demo-1234!` | <http://localhost:3000/compte> |

Le mot de passe admin peut être défini avant le premier lancement via `.env` (voir `.env.example`).

### Cartes de test (mode démonstration)

Aucun paiement réel n'est effectué. Sur la page de souscription :

- `4242 4242 4242 4242` → paiement accepté
- `4000 0000 0000 0002` → paiement refusé (pour tester le parcours d'erreur)

Date d'expiration future et CVC à 3 chiffres quelconques.

## Ce que contient le site

**Site public**

- Accueil : les trois publics, aperçu de l'éditeur à scénarios, comparatif face à Acrobat, parcours d'achat
- **Une page par public** : `/communes`, `/ecoles`, `/etat` — mêmes outils, mais leur vocabulaire, leurs exemples et leur acheteur (`src/content/segments.ts`)
- **Démo interactive** (`/demo`) : fusion, réorganisation, extraction, filigrane et numérotation de vrais PDF, entièrement dans le navigateur (pdf-lib + pdf.js), sans envoi de fichier
- Fonctionnalités (12 outils), Tarifs avec calculateur d'économies et comparatif, Sécurité et hébergement, Contact
- Mentions légales, conditions générales d'abonnement, politique de confidentialité

**Le parcours d'achat public** — c'est le cœur commercial

1. `/offre` : demande d'offre **sans créer de compte** (organisation, IDE, nombre de postes, contact)
2. `/admin/offres` : l'administration chiffre, fixe la validité, et reçoit **le lien à transmettre**
3. `/offre/<token>` : le client consulte son devis **sans connexion**, l'imprime pour sa Municipalité, puis l'accepte avec son **numéro de bon de commande**
4. L'acceptation crée en une transaction : le compte, l'abonnement (facturé, non prélevé) et la **facture ouverte à 30 jours**
5. La facture porte une **QR-facture suisse** conforme, imprimable aux dimensions normatives

Une offre non chiffrée n'est pas consultable ; une offre échue ne peut plus être acceptée (constaté à la lecture, sans tâche planifiée).

**Abonnements**

- Formules Poste, Secrétariat, Administration et Collectivité (sur devis), en mensuel ou annuel (2 mois offerts)
- Deux chemins par formule : carte bancaire (`allowCard`) et/ou offre puis facture (`allowInvoice`)
- Souscription en ligne par carte avec création de compte et facture immédiate
- Résiliation à l'échéance, réactivation, changement de formule (montée en gamme immédiate avec crédit prorata, descente à l'échéance)
- Renouvellements automatiques : appliqués à la consultation (sans tâche planifiée), avec facture à chaque période

**Espace client** (`/compte`)

- Tableau de bord : statistiques d'usage (documents, pages, signatures, OCR), graphique sur six mois, outils les plus utilisés, clé de licence et liens de téléchargement (web, Windows, macOS)
- **Équipe** (licence Établissement) : invitation des collaborateur·trice·s par e-mail, rôles, retrait. Une personne invitée obtient l'accès dès la création de son compte et voit « Licence fournie par votre établissement »
- Gestion de la formule, factures (imprimables / export PDF via le navigateur), profil et mot de passe
- Les opérations réalisées dans la démo par une personne connectée alimentent ses statistiques

**Administration** (`/admin`)

- Indicateurs (abonnements actifs, revenu mensuel récurrent, encaissé du mois, résiliations programmées), graphiques (encaissé, nouveaux comptes, documents traités par mois, répartition par formule)
- Listes des clients, abonnements, factures et messages reçus

## Personnaliser

| Quoi | Où |
| --- | --- |
| Coordonnées, textes, fonctionnalités, FAQ, témoignages, liens de téléchargement | `src/content/site.ts` |
| Les trois publics : titres, exemples, arguments, FAQ | `src/content/segments.ts` |
| IBAN, IDE, TVA, délai de paiement, conditions de l'offre | `src/content/facturation.ts` |
| Formules et prix | `src/content/plans.ts` (appliqué au prochain `npm run dev`) |
| Couleurs, typographies, styles de base | `src/app/globals.css` |
| Polices (auto-hébergées : Bricolage Grotesque, Manrope) | `src/fonts/` et `src/app/fonts.ts` |
| Aperçu de l'éditeur sur l'accueil | `src/components/app-mock.tsx` |

Les coordonnées (adresse, téléphone, e-mail, IDE), les témoignages, les garanties de sécurité (certifications, taux de disponibilité) et les liens de téléchargement sont des **valeurs provisoires** à vérifier ou remplacer.

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement (initialise la base si besoin) |
| `npm run build` puis `npm start` | Version optimisée |
| `npm run typecheck` | Vérification TypeScript |
| `npm run db:reset` | Supprime et recrée la base avec les données de démonstration |
| `npm run db:generate` | Génère une migration après modification de `src/lib/db/schema.ts` |
| `npm test` | Tests de la QR-facture (charge utile, IBAN, références, clés de contrôle) |
| `npm run e2e` | Parcours d'achat complet dans un navigateur, serveur démarré à part |

## La QR-facture

`src/lib/qr-facture.ts` construit la charge utile du code QR (norme suisse, version 0200) et calcule les références :

- **SCOR** (référence créancier ISO 11649, « RF… ») avec un IBAN ordinaire — c'est le défaut, et la seule option tant qu'on n'a pas demandé un QR-IBAN à sa banque ;
- **QRR** (27 chiffres, clé modulo 10 récursif) avec un QR-IBAN, reconnu à son identifiant d'institution entre 30000 et 31999.

Le type se déduit de l'IBAN : la banque rejette le mélange, et le code le refuse aussi.

`src/components/qr-facture.tsx` dessine la section paiement aux dimensions normatives — 210 × 105 mm, récépissé de 62 mm, code QR de 46 mm, croix suisse de 7 mm — en millimètres, parce que c'est là que la machine de tri de la banque lit.

**Ce qui est vérifié** : `npm test` couvre la charge utile ligne par ligne (l'ordre est normatif : une ligne oubliée décale tout), les clés de contrôle sur chaque position, et le refus des combinaisons invalides. `npm run e2e` va plus loin : il rasterise le code QR affiché et le **décode avec un lecteur indépendant**, comme le ferait l'e-banking d'une boursière communale — c'est la seule façon de savoir que la croix suisse posée au centre ne rend pas le code illisible.

## Stack technique

- [Next.js 16](https://nextjs.org) (App Router, Server Actions) · React 19 · TypeScript
- Tailwind CSS 4
- SQLite via [libsql](https://github.com/tursodatabase/libsql) + [Drizzle ORM](https://orm.drizzle.team) (migrations dans `drizzle/`)
- [pdf-lib](https://pdf-lib.js.org) et [pdf.js](https://mozilla.github.io/pdf.js/) (build « legacy », worker copié dans `public/`) pour la démo dans le navigateur
- Authentification maison par sessions (cookie httpOnly, mots de passe hachés avec bcrypt)

## Mettre en ligne sur Vercel

Le site a besoin de deux choses : un hébergeur et une base de données. Vercel
donne le premier, Turso la seconde, tous deux gratuits à ce volume. Comptez un
quart d'heure.

**1. La base de données.** Un hébergement sans serveur n'a pas de disque : une
base SQLite dans un fichier y serait perdue d'une requête à l'autre, avec les
offres et les factures. L'application refuse de démarrer dans ce cas plutôt que
de perdre des données en silence. Créez une base sur <https://turso.tech>
(« Create Database », région Frankfurt ou Amsterdam — la plus proche de la
Suisse), puis relevez deux valeurs : l'URL `libsql://…` et un jeton
d'authentification.

**2. Le projet Vercel.** Sur <https://vercel.com/new>, importez le dépôt
`Atelier-Neroli`. Une seule chose est à ne pas rater :

> **Root Directory : `site`**

Sans cela, Vercel lit le `vercel.json` à la racine du dépôt — celui de
l'application PDF, qui construit un tout autre site. Le reste (framework
Next.js, commandes de construction) se détecte tout seul.

**3. Les variables d'environnement**, dans les réglages du projet, pour tous
les environnements :

| Variable | Valeur | Obligatoire |
| --- | --- | --- |
| `DATABASE_URL` | `libsql://votre-base.turso.io` | oui |
| `DATABASE_AUTH_TOKEN` | le jeton Turso | oui |
| `ADMIN_PASSWORD` | un mot de passe que vous choisissez | oui |
| `ADMIN_EMAIL` | votre adresse | non (défaut : `admin@blonaypdf.ch`) |
| `SITE_URL` | l'adresse publique, une fois connue | non |
| `SEED_DEMO` | `1` pour créer aussi les comptes de démonstration | non |

`ADMIN_PASSWORD` est exigé : le mot de passe par défaut est écrit dans ce
dépôt, qui est public. Sans lui, la construction échoue — c'est voulu.

**4. Déployez.** La construction applique les migrations et crée le compte
administrateur sur la base Turso. Les comptes de démonstration ne sont pas
créés en ligne, sauf si vous posez `SEED_DEMO=1`.

Si quelque chose manque, la construction s'arrête avec un message qui dit quoi
faire, en français : c'est préférable à un site en ligne qui perd les commandes.

**Ensuite.** Vérifiez la région d'exécution dans les réglages du projet
(Frankfurt, `fra1`, est la plus proche de la Suisse) et branchez votre nom de
domaine. Les pages `/offre/…`, `/compte/…` et `/admin/…` sont déjà marquées
« ne pas indexer » et « ne pas mettre en cache » par `vercel.json` : un devis
nominatif n'a rien à faire dans un moteur de recherche.

## À vérifier avant de vendre

Rien de ce qui suit n'empêche le site de fonctionner, et tout doit être réglé avant la première offre envoyée à une vraie commune.

1. **L'IBAN, l'IDE et la TVA** (`src/content/facturation.ts`). L'IBAN livré est l'exemple publié de la norme ISO 13616 : syntaxiquement valide, mais il ne mène à aucun compte. Une facture envoyée avec celui-là ne sera jamais payée. Faites aussi contrôler **une vraie référence** par votre banque avant le premier envoi.
2. **Les prix** (`src/content/plans.ts`). Valeurs de départ défendables, pas des prix arrêtés.
3. **Les seuils de marchés publics.** Le site affirme que le montant reste « dans la plupart des cantons sous le seuil du gré à gré ». C'est vrai aujourd'hui pour des montants de cet ordre, mais les seuils se révisent et changent d'un canton à l'autre : à faire confirmer, ou à reformuler plus prudemment (`src/content/segments.ts`).
4. **Les témoignages** (`src/content/site.ts`) sont des exemples marqués « à recueillir ». Ne publiez pas de faux avis.
5. **Les coordonnées** : adresse, téléphone, courriels.
6. **L'envoi des courriels.** Aujourd'hui, l'offre chiffrée ne part pas toute seule : l'administration copie le lien depuis `/admin/offres` et l'envoie à la main. C'est utilisable tel quel, et c'est la première chose à automatiser.
7. **Le paiement par carte** : remplacer `chargeCard` dans `src/lib/payments.ts` par un prestataire (Stripe, Datatrans, Payrexx…) en conservant la signature. Les renouvellements devront alors passer par une tâche planifiée ou les webhooks du prestataire. Le chemin sur facture, lui, ne dépend d'aucun prestataire.
8. **Licence** : la clé affichée dans l'espace client est dérivée de l'identifiant du compte (`src/app/compte/page.tsx`) ; la faire vérifier par l'application de bureau.
9. **Hébergement** : voir « Mettre en ligne sur Vercel » ci-dessus. La base Turso gratuite suffit largement à quelques centaines de clients.
10. **Juridique** : faire relire les CGV et la politique de confidentialité.
