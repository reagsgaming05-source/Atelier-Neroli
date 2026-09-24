import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export const DATABASE_URL = process.env.DATABASE_URL ?? "file:./data/blonay-pdf.db";

// S'assure que le dossier de la base existe (file:./data/xxx.db).
if (DATABASE_URL.startsWith("file:")) {
  const filePath = DATABASE_URL.slice("file:".length);
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

const globalForDb = globalThis as unknown as { __atelierNeroliClient?: Client };

const client = globalForDb.__atelierNeroliClient ?? createClient({ url: DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.__atelierNeroliClient = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
export { schema };
