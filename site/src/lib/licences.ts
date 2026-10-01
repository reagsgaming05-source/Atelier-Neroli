import "server-only";
import { createPublicKey, randomUUID, verify } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { licences } from "@/lib/db/schema";
import cles from "@/content/licence-cles.json";

/**
 * Le registre des licences émises — et la vérification de ce qu'on y range.
 *
 * Le site ne SIGNE rien : la clé privée est sur le poste de l'éditeur (voir
 * outils/editeur/emettre-licence.js). Il vérifie qu'un fichier qu'on lui remet est
 * bien signé avec l'une des clés publiques de l'éditeur avant de le garder, pour ne
 * pas ranger — et remettre à un client — un fichier qu'aucune application n'accepterait.
 *
 * La sérialisation canonique et la vérification reproduisent outils/desktop/signature.js :
 * le site se déploie seul, il ne peut pas importer le code du logiciel. Un test
 * (test/licences.test.ts) signe avec l'outil de l'éditeur et vérifie avec ce code,
 * pour que les deux ne divergent pas sans que quelqu'un le voie.
 */

export type ClePublique = { id: string; cle: string };

// L'enveloppe DER d'une clé publique Ed25519 : 12 octets fixes devant les 32 de la clé.
const PREFIXE_SPKI = Buffer.from("302a300506032b6570032100", "hex");
const publique = (b64: string) => createPublicKey({ key: Buffer.concat([PREFIXE_SPKI, Buffer.from(b64, "base64")]), format: "der", type: "spki" });

export function clesDeLicence(): ClePublique[] {
  // Les clés peuvent aussi venir de l'environnement : un déploiement sans redéployer le dépôt.
  const env = process.env.LICENCE_CLES_PUBLIQUES;
  if (env) {
    try {
      const j = JSON.parse(env);
      return Array.isArray(j) ? j : Array.isArray(j.licence) ? j.licence : [];
    } catch {
      return [];
    }
  }
  return (cles as { licence: ClePublique[] }).licence ?? [];
}

type Piece = Record<string, string | number | boolean | null>;

export function canonique(piece: Piece): string {
  const o: Piece = { ...piece };
  delete o.sig;
  const ks = Object.keys(o).sort();
  for (const k of ks) if (o[k] !== null && typeof o[k] === "object") throw new Error(`« ${k} » n'est pas une valeur simple`);
  return JSON.stringify(o, ks);
}

export type LicenceLue =
  | { ok: true; piece: { id: string; client: string; ide: string; postes: number; modele: "site" | "interne"; emise: string; majJusqu: string; cle: string }; corps: string }
  | { ok: false; raison: string };

/** Vérifie un fichier de licence tel que le client le reçoit. */
export function lireLicence(corps: string, ks: ClePublique[] = clesDeLicence()): LicenceLue {
  let piece: Piece;
  try {
    piece = JSON.parse(corps.replace(/^﻿/, ""));
  } catch {
    return { ok: false, raison: "Ce n'est pas du JSON." };
  }
  if (!piece || typeof piece !== "object" || Array.isArray(piece)) return { ok: false, raison: "Ce n'est pas un fichier de licence." };
  if (piece.v !== 1 || piece.objet !== "licence") return { ok: false, raison: "Ce n'est pas un fichier de licence." };
  if (typeof piece.sig !== "string" || !piece.sig) return { ok: false, raison: "Le fichier n'est pas signé." };
  if (!ks.length) return { ok: false, raison: "Aucune clé publique de licence n'est configurée sur le site (src/content/licence-cles.json ou LICENCE_CLES_PUBLIQUES)." };
  const candidates = typeof piece.cle === "string" && piece.cle ? ks.filter((c) => c.id === piece.cle) : ks;
  if (!candidates.length) return { ok: false, raison: `Signé par une clé que le site ne connaît pas (${String(piece.cle)}).` };
  let message: Buffer;
  try {
    message = Buffer.from(canonique(piece), "utf8");
  } catch (e) {
    return { ok: false, raison: e instanceof Error ? e.message : "Fichier illisible." };
  }
  const sig = Buffer.from(piece.sig, "base64");
  const bon = candidates.some((c) => {
    try {
      return verify(null, message, publique(c.cle), sig);
    } catch {
      return false;
    }
  });
  if (!bon) return { ok: false, raison: "La signature ne correspond pas : le fichier a été modifié, ou il n'est pas de l'éditeur." };
  if (piece.modele !== "site" && piece.modele !== "interne") return { ok: false, raison: "Modèle de licence inconnu." };
  if (typeof piece.id !== "string" || !piece.id || typeof piece.client !== "string" || !piece.client) return { ok: false, raison: "Il manque l'identifiant ou le client." };
  return {
    ok: true,
    corps,
    piece: {
      id: piece.id,
      client: piece.client,
      ide: String(piece.ide ?? ""),
      postes: Number(piece.postes) || 0,
      modele: piece.modele,
      emise: String(piece.emise ?? ""),
      majJusqu: String(piece.majJusqu ?? ""),
      cle: String(piece.cle ?? ""),
    },
  };
}

/** Range une licence émise. Refuse celle qui n'est pas valide, ou dont le numéro existe déjà. */
export async function enregistrerLicence(opts: { corps: string; userId?: string | null; subscriptionId?: string | null; invoiceId?: string | null; reason?: string | null; remplace?: string | null }) {
  const lue = lireLicence(opts.corps);
  if (!lue.ok) return { ok: false as const, raison: lue.raison };
  const existe = await db.query.licences.findFirst({ where: eq(licences.number, lue.piece.id) });
  if (existe) return { ok: false as const, raison: `Le numéro ${lue.piece.id} est déjà enregistré. Une réémission porte un nouveau numéro.` };
  const id = randomUUID();
  await db.insert(licences).values({
    id,
    number: lue.piece.id,
    client: lue.piece.client,
    ide: lue.piece.ide || null,
    seats: lue.piece.postes,
    model: lue.piece.modele,
    issuedOn: lue.piece.emise,
    updatesUntil: lue.piece.majJusqu || null,
    body: opts.corps,
    keyId: lue.piece.cle,
    userId: opts.userId || null,
    subscriptionId: opts.subscriptionId || null,
    invoiceId: opts.invoiceId || null,
    reason: opts.reason || null,
  });
  // Une réémission remplace l'ancienne : on la garde, on ne la remet plus.
  if (opts.remplace) await db.update(licences).set({ supersededById: id }).where(eq(licences.id, opts.remplace));
  return { ok: true as const, id, number: lue.piece.id };
}

export async function listerLesLicences() {
  return db.query.licences.findMany({ orderBy: [desc(licences.createdAt)], with: { user: true } });
}

/** La licence courante d'un client (la plus récente non remplacée). */
export async function licenceDe(userId: string) {
  return db.query.licences.findFirst({
    where: and(eq(licences.userId, userId), isNull(licences.supersededById)),
    orderBy: [desc(licences.createdAt)],
  });
}
