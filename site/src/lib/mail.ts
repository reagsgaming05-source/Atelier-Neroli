import "server-only";
import nodemailer from "nodemailer";
import { editeur } from "@/content/editeur";

/**
 * L'envoi de courriel du site : l'offre qui part chez le client, la confirmation de sa
 * commande, sa licence en pièce jointe, le message de contact qui arrive chez le support.
 *
 * Le courriel est le canal de livraison du produit : sans lui, une licence existe mais
 * n'atteint pas le client. Le site ne doit pourtant JAMAIS prétendre avoir envoyé ce qui ne
 * l'a pas été : chaque envoi rend son verdict (« envoyé », « non configuré », « échec »),
 * et l'administration le lit.
 *
 *   MAIL_SMTP_URL=smtps://utilisateur:motdepasse@smtp.exemple.ch:465   (le prestataire d'envoi)
 *   MAIL_DE=Nom de l'éditeur <ne-pas-repondre@exemple.ch>
 *
 * Le mot de passe SMTP est une variable d'environnement de l'hébergement : il ne s'écrit ni
 * dans le dépôt, ni dans un formulaire, ni dans une conversation.
 */

export type Verdict = { etat: "envoye" } | { etat: "non-configure"; raison: string } | { etat: "echec"; raison: string };

export type Courriel = {
  a: string;
  sujet: string;
  texte: string;
  repondreA?: string;
  pieces?: { nom: string; contenu: string; type?: string }[];
};

export function courrielConfigure(): boolean {
  return !!process.env.MAIL_SMTP_URL && !!(process.env.MAIL_DE || editeur.nom);
}

function expediteur(): string {
  if (process.env.MAIL_DE) return process.env.MAIL_DE;
  return `${editeur.nom} <${editeur.emailSupport || editeur.email}>`;
}

export async function envoyer(c: Courriel): Promise<Verdict> {
  if (!process.env.MAIL_SMTP_URL) {
    return { etat: "non-configure", raison: "MAIL_SMTP_URL n'est pas définie sur ce site : aucun courriel ne part." };
  }
  if (!process.env.MAIL_DE && !editeur.nom) {
    return { etat: "non-configure", raison: "L'expéditeur n'est pas renseigné (MAIL_DE, ou EDITEUR_NOM et EDITEUR_EMAIL)." };
  }
  try {
    const transport = nodemailer.createTransport(process.env.MAIL_SMTP_URL);
    await transport.sendMail({
      from: expediteur(),
      to: c.a,
      replyTo: c.repondreA || editeur.emailSupport || editeur.email || undefined,
      subject: c.sujet,
      text: c.texte,
      attachments: c.pieces?.map((p) => ({ filename: p.nom, content: p.contenu, contentType: p.type ?? "application/json" })),
    });
    return { etat: "envoye" };
  } catch (e) {
    return { etat: "echec", raison: e instanceof Error ? e.message : "envoi impossible" };
  }
}

/** Une phrase pour l'administration. */
export function dire(v: Verdict, destinataire: string): string {
  if (v.etat === "envoye") return `Courriel envoyé à ${destinataire}.`;
  if (v.etat === "non-configure") return `Courriel NON envoyé (${v.raison}) — transmettez-le vous-même.`;
  return `Courriel NON envoyé à ${destinataire} : ${v.raison}. Transmettez-le vous-même.`;
}

export function urlDuSite(chemin: string): string {
  const base = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return base + chemin;
}
