import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * La base, en local comme en ligne.
 *
 * En développement, c'est un simple fichier SQLite à côté du projet : rien à
 * installer, rien à démarrer, et on peut l'effacer pour repartir à zéro.
 *
 * En ligne, ce fichier n'existe pas. Un hébergement sans serveur — Vercel et
 * les autres — donne à chaque requête un disque vide et en lecture seule : une
 * base écrite dans un fichier y serait perdue à la requête suivante, quand elle
 * ne ferait pas planter l'écriture. Il faut donc une base distante, et
 * `@libsql/client` parle le même langage aux deux : une URL en « libsql:// »
 * avec un jeton, et tout le reste du code est identique.
 *
 *   DATABASE_URL=file:./data/blonay-pdf.db        (local, par défaut)
 *   DATABASE_URL=libsql://xxx.turso.io            (en ligne)
 *   DATABASE_AUTH_TOKEN=…                         (en ligne)
 */

export const DATABASE_URL = process.env.DATABASE_URL ?? "file:./data/blonay-pdf.db";
const AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN || undefined;

const estUnFichier = DATABASE_URL.startsWith("file:");

/**
 * Là où il n'y a pas de disque, une base en fichier est un piège : le site
 * marche à la première requête et a tout oublié à la seconde. On refuse donc
 * de démarrer, plutôt que de perdre des offres et des factures en silence.
 *
 * La question n'est pas « est-ce la production » mais « y a-t-il un disque » :
 * construire la version optimisée sur son propre poste est parfaitement
 * légitime, et ne doit pas échouer pour autant.
 */
export const SANS_DISQUE = Boolean(
  process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.CF_PAGES,
);

if (estUnFichier && SANS_DISQUE) {
  throw new Error(
    "DATABASE_URL pointe sur un fichier, mais cet hébergement n'a pas de disque persistant : les comptes, " +
      "les offres et les factures seraient perdus d'une requête à l'autre. Posez DATABASE_URL et " +
      "DATABASE_AUTH_TOKEN sur une base libsql distante — voir README, « Mettre en ligne sur Vercel ».",
  );
}
if (estUnFichier && process.env.NODE_ENV === "production" && !process.env.BLONAY_FICHIER_EN_PROD) {
  // Hébergement sur une machine à soi : c'est légitime, mais autant que ce
  // soit un choix et non un oubli.
  console.warn(
    "⚠ Base de données dans un fichier avec NODE_ENV=production. Correct si vous hébergez sur une machine " +
      "à disque ; posez BLONAY_FICHIER_EN_PROD=1 pour ne plus voir cet avertissement.",
  );
}

// S'assure que le dossier de la base existe (file:./data/xxx.db).
if (estUnFichier) {
  const filePath = DATABASE_URL.slice("file:".length);
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

// Une seule connexion par instance : sans cela, chaque rechargement à chaud en
// développement en ouvrirait une de plus, et en ligne chaque module rechargé
// rouvrirait la sienne.
const globalForDb = globalThis as unknown as { __atelierNeroliClient?: Client };

const client = globalForDb.__atelierNeroliClient ?? createClient({ url: DATABASE_URL, authToken: AUTH_TOKEN });
globalForDb.__atelierNeroliClient = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
export { schema };
