# Blonay PDF — site et espace client

Site vitrine et système d'abonnements pour **Blonay PDF**, l'outil PDF complet (éditer, fusionner, convertir, signer, protéger, annoter) destiné à l'État de Vaud et à l'ensemble des établissements scolaires.
Tout fonctionne **en local**, sans service externe : base SQLite dans un fichier, paiement en mode démonstration.

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
| Client (formule Établissement active) | `marie.demo@exemple.ch` | `Demo-1234!` | <http://localhost:3000/compte> |

Le mot de passe admin peut être défini avant le premier lancement via `.env` (voir `.env.example`).

### Cartes de test (mode démonstration)

Aucun paiement réel n'est effectué. Sur la page de souscription :

- `4242 4242 4242 4242` → paiement accepté
- `4000 0000 0000 0002` → paiement refusé (pour tester le parcours d'erreur)

Date d'expiration future et CVC à 3 chiffres quelconques.

## Ce que contient le site

**Site public**

- Accueil avec aperçu de l'éditeur, Fonctionnalités (12 outils), Tarifs (mensuel / annuel), Sécurité et hébergement, Contact (formulaire enregistré en base)
- Mentions légales, conditions générales d'abonnement, politique de confidentialité

**Abonnements**

- Formules Enseignant·e et Établissement, en mensuel ou annuel (2 mois offerts), et formule Canton sur devis (pas de souscription en ligne : renvoi vers le contact)
- Souscription en ligne avec création de compte, paiement démo et facture immédiate
- Résiliation à l'échéance, réactivation, changement de formule (montée en gamme immédiate avec crédit prorata, descente à l'échéance)
- Renouvellements automatiques : appliqués à la consultation (sans tâche planifiée), avec facture à chaque période

**Espace client** (`/compte`)

- Tableau de bord avec clé de licence et liens de téléchargement (web, Windows, macOS)
- Gestion de la formule, factures (imprimables / export PDF via le navigateur), profil et mot de passe

**Administration** (`/admin`)

- Indicateurs (abonnements actifs, revenu mensuel récurrent, encaissé du mois, résiliations programmées)
- Listes des clients, abonnements, factures et messages reçus

## Personnaliser

| Quoi | Où |
| --- | --- |
| Coordonnées, textes, fonctionnalités, FAQ, témoignages, liens de téléchargement | `src/content/site.ts` |
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

## Maquette partageable

Le dossier `maquette/` contient une version statique navigable du site (toutes les pages, y compris l'espace client et l'administration avec des données de démonstration), publiable sur GitHub Pages via le workflow `.github/workflows/pages.yml`. GitHub Pages doit être activé une fois dans Settings → Pages → Source : « GitHub Actions ».

## Stack technique

- [Next.js 16](https://nextjs.org) (App Router, Server Actions) · React 19 · TypeScript
- Tailwind CSS 4
- SQLite via [libsql](https://github.com/tursodatabase/libsql) + [Drizzle ORM](https://orm.drizzle.team) (migrations dans `drizzle/`)
- Authentification maison par sessions (cookie httpOnly, mots de passe hachés avec bcrypt)

## Passer en production

1. **Paiement** : remplacer `chargeCard` dans `src/lib/payments.ts` par un prestataire (Stripe, Datatrans, Payrexx…) en conservant la signature ; les renouvellements devront alors être déclenchés par une tâche planifiée ou les webhooks du prestataire.
2. **Licence** : la clé affichée dans l'espace client est dérivée de l'identifiant du compte (`src/app/compte/page.tsx`) ; la faire vérifier par l'application de bureau via une API.
3. **E-mails** : brancher un envoi (confirmation, facture, résiliation) là où les actions serveur retournent aujourd'hui un message.
4. **Hébergement** : définir `SITE_URL`, `DATABASE_URL` et un compte admin dédié dans les variables d'environnement.
5. **Juridique** : faire relire les CGV et la politique de confidentialité, compléter le numéro IDE.
