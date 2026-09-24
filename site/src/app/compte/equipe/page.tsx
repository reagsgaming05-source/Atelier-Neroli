import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { InviteForm } from "@/components/account/invite-form";
import { Panel } from "@/components/account/space-shell";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { removeMemberAction } from "@/lib/actions/org";
import { getAccess, isEstablishmentOwner } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { formatDateShort } from "@/lib/format";
import { listOrgMembers } from "@/lib/org";

export const metadata: Metadata = { title: "Équipe" };

export default async function EquipePage() {
  const user = await requireUser("/compte/equipe");
  const access = await getAccess(user);
  if (!isEstablishmentOwner(access)) redirect("/compte/abonnement?notice=equipe");

  const members = await listOrgMembers(user.id);
  const active = members.filter((m) => m.status === "active").length;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Collaborateur·trice·s actifs", value: active + 1 },
          { label: "Invitations en attente", value: members.length - active },
          { label: "Plafond", value: "Aucun" },
        ].map((k) => (
          <div key={k.label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">{k.label}</p>
            <p className="mt-3 font-display text-[1.75rem] font-semibold leading-none tabular-nums text-ink-900">{k.value}</p>
          </div>
        ))}
      </div>

      <Panel title="Inviter une personne">
        <p className="-mt-2 mb-5 text-sm text-ink-500">
          La personne reçoit l'accès dès qu'elle crée un compte avec cette adresse (ou immédiatement si elle en a déjà un). Les rôles « Administration » peuvent gérer l'équipe et consulter les statistiques de l'établissement.
        </p>
        <InviteForm />
      </Panel>

      <Panel title={`Membres de l'établissement (${members.length + 1})`} flush>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Personne</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Depuis</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="font-semibold text-ink-900">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="block text-xs text-ink-500">{user.email}</span>
                </td>
                <td>Titulaire de la licence</td>
                <td>
                  <Badge tone="green">Actif</Badge>
                </td>
                <td>{formatDateShort(access.subscription.createdAt)}</td>
                <td></td>
              </tr>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className="font-semibold text-ink-900">{m.name}</span>
                    <span className="block text-xs text-ink-500">{m.email}</span>
                  </td>
                  <td className="capitalize">{m.role === "administration" ? "Administration" : "Collaborateur·trice"}</td>
                  <td>{m.status === "active" ? <Badge tone="green">Actif</Badge> : <Badge tone="amber">Invité·e</Badge>}</td>
                  <td>{formatDateShort(m.joinedAt ?? m.invitedAt)}</td>
                  <td className="text-right">
                    <ConfirmForm action={removeMemberAction} message={`Retirer ${m.name} de l'établissement ?`}>
                      <input type="hidden" name="id" value={m.id} />
                      <SubmitButton variant="ghost" size="sm" pendingText="…">
                        Retirer
                      </SubmitButton>
                    </ConfirmForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="flex items-center gap-2 text-xs text-ink-400">
        <Users className="size-3.5" aria-hidden />
        La formule Établissement ne limite pas le nombre de collaborateur·trice·s.
      </p>
    </>
  );
}
