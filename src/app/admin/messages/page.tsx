import { desc } from "drizzle-orm";
import { Panel } from "@/components/account/space-shell";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { toggleMessageReadAction } from "@/lib/actions/admin";
import { db } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";

export default async function AdminMessagesPage() {
  const rows = await db.query.contactMessages.findMany({ orderBy: [desc(contactMessages.createdAt)] });

  if (rows.length === 0) {
    return (
      <Panel title="Messages">
        <p className="text-sm text-ink-500">Aucun message reçu pour le moment. Les demandes envoyées depuis la page Contact apparaîtront ici.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((m) => (
        <article key={m.id} className={`card p-6 ${m.readAt ? "opacity-80" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-ink-900">{m.subject}</h2>
                {!m.readAt && <Badge tone="amber">Nouveau</Badge>}
              </div>
              <p className="mt-1 text-sm text-ink-500">
                {m.name} · <a href={`mailto:${m.email}`} className="hover:text-forest-700">{m.email}</a>
                {m.phone && <> · {m.phone}</>}
              </p>
              <p className="mt-0.5 text-xs text-ink-400">{formatDateTime(m.createdAt)}</p>
            </div>
            <form action={toggleMessageReadAction}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="read" value={m.readAt ? "0" : "1"} />
              <SubmitButton variant="secondary" size="sm">
                {m.readAt ? "Marquer non lu" : "Marquer comme lu"}
              </SubmitButton>
            </form>
          </div>
          <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink-700">{m.message}</p>
        </article>
      ))}
    </div>
  );
}
