# Atelier Néroli — site & espace membres

Site vitrine et système d'abonnements pour **Atelier Néroli**, maison de soins et de bien-être à Blonay (VD).
Tout fonctionne **en local**, sans service externe : base SQLite dans un fichier, paiement en mode démonstration.

## Démarrage rapide

Prérequis : Node.js 20.9 ou plus récent.

```bash
npm install
npm run dev
```

Puis ouvrir <http://localhost:3000>.

Au premier lancement, la base de données est créée automatiquement (`data/atelier-neroli.db`), les formules d'abonnement sont insérées et deux comptes de démonstration sont créés.

### Comptes de démonstration

| Rôle | E-mail | Mot de passe | Accès |
| --- | --- | --- | --- |
| Administration | `admin@atelier-neroli.ch` | `Neroli-Admin-2026!` | <http://localhost:3000/admin> |
| Membre (abonnement Signature actif) | `marie.demo@exemple.ch` | `Demo-1234!` | <http://localhost:3000/compte> |

Le mot de passe admin peut être défini avant le premier lancement via `.env` (voir `.env.example`).

### Cartes de test (mode démonstration)

Aucun paiement réel n'est effectué. Sur la page de souscription :

- `4242 4242 4242 4242` → paiement accepté
- `4000 0000 0000 0002` → paiement refusé (pour tester le parcours d'erreur)

Date d'expiration future et CVC à 3 chiffres quelconques.

## Ce que contient le site

**Site public**

- Accueil, carte des soins, abonnements (mensuel / annuel), l'atelier, contact (formulaire enregistré en base)
- Mentions légales, conditions générales, politique de confidentialité

**Abonnements**

- Trois formules (Essentiel, Signature, Prestige), en mensuel ou annuel (2 mois offerts)
- Souscription en ligne avec création de compte, paiement démo et facture immédiate
- Résiliation à l'échéance, réactivation, changement de formule (montée en gamme immédiate avec crédit prorata, descente à l'échéance)
- Renouvellements automatiques : appliqués à la consultation (sans tâche planifiée), avec facture à chaque période

**Espace membre** (`/compte`)

- Tableau de bord, gestion de l'abonnement, factures (imprimables / export PDF via le navigateur), profil et mot de passe

**Administration** (`/admin`)

- Indicateurs (abonnements actifs, revenu mensuel récurrent, encaissé du mois, résiliations programmées)
- Listes des membres, abonnements, factures et messages reçus

## Personnaliser

| Quoi | Où |
| --- | --- |
| Coordonnées, horaires, textes, soins, FAQ, témoignages, équipe | `src/content/site.ts` |
| Formules et prix des abonnements | `src/content/plans.ts` (appliqué au prochain `npm run dev`) |
| Couleurs, typographies, styles de base | `src/app/globals.css` |
| Polices (auto-hébergées) | `src/fonts/` et `src/app/fonts.ts` |

Les coordonnées (adresse, téléphone, e-mail, IDE), les témoignages et les prénoms de l'équipe sont des **valeurs provisoires** à remplacer.

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement (initialise la base si besoin) |
| `npm run build` puis `npm start` | Version optimisée |
| `npm run typecheck` | Vérification TypeScript |
| `npm run db:reset` | Supprime et recrée la base avec les données de démonstration |
| `npm run db:generate` | Génère une migration après modification de `src/lib/db/schema.ts` |

## Stack technique

- [Next.js 16](https://nextjs.org) (App Router, Server Actions) · React 19 · TypeScript
- Tailwind CSS 4
- SQLite via [libsql](https://github.com/tursodatabase/libsql) + [Drizzle ORM](https://orm.drizzle.team) (migrations dans `drizzle/`)
- Authentification maison par sessions (cookie httpOnly, mots de passe hachés avec bcrypt)

## Passer en production

1. **Paiement** : remplacer `chargeCard` dans `src/lib/payments.ts` par un prestataire (Stripe, Datatrans, Payrexx…) en conservant la signature ; les renouvellements devront alors être déclenchés par une tâche planifiée ou les webhooks du prestataire.
2. **E-mails** : brancher un envoi (confirmation, facture, résiliation) là où les actions serveur retournent aujourd'hui un message.
3. **Hébergement** : définir `SITE_URL`, `DATABASE_URL` et un compte admin dédié dans les variables d'environnement.
4. **Juridique** : faire relire les CGV et la politique de confidentialité, compléter le numéro IDE.
