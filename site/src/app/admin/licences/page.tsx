import { Panel, Notice } from "@/components/account/space-shell";
import { Badge } from "@/components/ui/badge";
import { LicenceForm } from "@/components/licence-form";
import { clesDeLicence, listerLesLicences } from "@/lib/licences";
import { formatDateShort, fullName } from "@/lib/format";

export default async function AdminLicencesPage() {
  const rows = await listerLesLicences();
  const cles = clesDeLicence();

  return (
    <>
      <Panel title="Ranger une licence émise">
        <p className="mb-5 max-w-2xl text-sm text-ink-500">
          Les licences se signent <strong>sur votre poste</strong>, avec <code>node editeur/emettre-licence.js</code> : la clé privée ne vient jamais ici. Collez le fichier produit : le site
          vérifie la signature, le garde tel quel et le met à disposition du client, en téléchargement permanent dans son espace.
        </p>
        {cles.length === 0 ? (
          <Notice tone="error">
            Aucune clé publique de licence n&rsquo;est configurée : générez-la avec <code>node editeur/generer-cles.js licence</code>, puis commitez <code>site/src/content/licence-cles.json</code>{" "}
            (ou posez la variable <code>LICENCE_CLES_PUBLIQUES</code>). Tant qu&rsquo;elle manque, aucune licence ne peut être rangée.
          </Notice>
        ) : (
          <LicenceForm />
        )}
      </Panel>

      <Panel title={`Licences émises (${rows.length})`} flush>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Client</th>
                <th>Postes</th>
                <th>Mises à jour jusqu&rsquo;au</th>
                <th>Rattachée à</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap font-semibold text-ink-900">{l.number}</td>
                  <td>{l.client}</td>
                  <td>{l.seats || "illimités"}</td>
                  <td>{l.updatesUntil ?? "—"}</td>
                  <td>{l.user ? fullName(l.user) : "—"}</td>
                  <td>
                    {l.supersededById ? <Badge tone="gray">Remplacée</Badge> : <Badge tone="green">En vigueur</Badge>}
                    <span className="ml-2 text-xs text-ink-400">{formatDateShort(l.createdAt)}</span>
                    {l.reason ? <p className="mt-1 text-xs text-ink-500">{l.reason}</p> : null}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-ink-500">
                    Aucune licence rangée pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
