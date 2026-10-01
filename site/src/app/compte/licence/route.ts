import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { licenceDe } from "@/lib/licences";

/**
 * Le fichier de licence du client, en téléchargement permanent : un fichier perdu se
 * retrouve tout seul, sans appeler personne. C'est le corps signé tel que l'éditeur l'a
 * émis, à l'octet près.
 */
export async function GET() {
  const user = await requireUser("/compte");
  const access = await getAccess(user);
  // Une personne rattachée à un établissement télécharge celle du titulaire.
  const titulaire = access.kind === "member" ? access.owner.id : user.id;
  const l = await licenceDe(titulaire);
  if (!l) return new NextResponse("Aucune licence n'est encore émise pour ce compte.", { status: 404 });
  return new NextResponse(l.body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="licence.json"',
      "Cache-Control": "private, no-store",
    },
  });
}
