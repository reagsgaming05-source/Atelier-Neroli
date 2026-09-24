import "./env";
import { randomUUID } from "node:crypto";
import { eq, notInArray } from "drizzle-orm";
import { db, SANS_DISQUE } from "../src/lib/db";
import { invoices, orgMembers, plans, subscriptions, usageEvents, users, USAGE_TOOLS } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/password";
import { planCatalog } from "../src/content/plans";

export const DEMO_MEMBER = { email: "marie.demo@exemple.ch", password: "Demo-1234!" };

export async function runSeed() {
  // 1. Formules (upsert par slug, pour permettre d'ajuster les prix dans src/content/plans.ts)
  for (const plan of planCatalog) {
    const existing = await db.query.plans.findFirst({ where: eq(plans.slug, plan.slug) });
    if (existing) {
      await db.update(plans).set({ ...plan, active: true }).where(eq(plans.id, existing.id));
    } else {
      await db.insert(plans).values({ id: randomUUID(), ...plan, active: true });
    }
  }
  // Les formules retirées du catalogue restent en base (historique des factures) mais ne sont plus proposées.
  const slugs = planCatalog.map((p) => p.slug);
  await db.update(plans).set({ active: false }).where(notInArray(plans.slug, slugs));

  // 2. Compte administrateur
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@blonaypdf.ch").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "BlonayPDF-Admin-2026!";
  if (!process.env.ADMIN_PASSWORD && SANS_DISQUE) {
    throw new Error(
      "ADMIN_PASSWORD n'est pas défini. Le mot de passe administrateur par défaut est écrit dans le dépôt, " +
        "qui est public : le poser tel quel en ligne ouvrirait l'administration à qui a lu le code.",
    );
  }
  const admin = await db.query.users.findFirst({ where: eq(users.email, adminEmail) });
  if (!admin) {
    await db.insert(users).values({
      id: randomUUID(),
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      firstName: "Administration",
      lastName: "Blonay PDF",
      role: "admin",
    });
    console.log(`✔ Compte administrateur créé : ${adminEmail}`);
  }

  // 3. Membre de démonstration avec un abonnement et un historique de factures.
  //
  // Sur une vraie mise en ligne, ces comptes n'ont rien à faire là : un compte
  // au mot de passe public et des factures inventées, dans le dos de la
  // personne qui déploie. On ne les crée donc qu'en développement, ou quand on
  // les demande expressément — pour une démonstration commerciale, par exemple.
  const avecDemo = process.env.SEED_DEMO === "1" || !SANS_DISQUE;
  const demo = avecDemo ? await db.query.users.findFirst({ where: eq(users.email, DEMO_MEMBER.email) }) : true;
  if (!demo) {
    const pro = await db.query.plans.findFirst({ where: eq(plans.slug, "administration") });
    if (!pro) throw new Error("Formule 'administration' introuvable.");

    const userId = randomUUID();
    await db.insert(users).values({
      id: userId,
      email: DEMO_MEMBER.email,
      passwordHash: await hashPassword(DEMO_MEMBER.password),
      firstName: "Marie",
      lastName: "Dupont",
      phone: "+41 79 000 00 00",
      role: "member",
      createdAt: monthsAgo(3),
    });

    const subscriptionId = randomUUID();
    const periodStart = monthsAgo(0, 12);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await db.insert(subscriptions).values({
      id: subscriptionId,
      userId,
      planId: pro.id,
      interval: "month",
      status: "active",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      paymentBrand: "Visa",
      paymentLast4: "4242",
      createdAt: monthsAgo(3),
      updatedAt: periodStart,
    });

    const year = new Date().getFullYear();
    let n = 1;
    for (const offset of [3, 2, 1, 0]) {
      const start = monthsAgo(offset, 12);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      await db.insert(invoices).values({
        id: randomUUID(),
        number: `AN-${year}-${String(n++).padStart(4, "0")}`,
        userId,
        subscriptionId,
        description: `${offset === 3 ? "Abonnement" : "Renouvellement"} Établissement — mensuel`,
        amountCents: pro.priceMonthlyCents,
        status: "paid",
        periodStart: start,
        periodEnd: end,
        issuedAt: start,
        paidAt: start,
        paymentBrand: "Visa",
        paymentLast4: "4242",
      });
    }
    // Collaborateur·trice·s de l'établissement : deux comptes actifs, une invitation en attente
    const collaborators = [
      { email: "paul.martin@exemple.ch", firstName: "Paul", lastName: "Martin", role: "collaborateur" as const, account: true },
      { email: "sophie.rey@exemple.ch", firstName: "Sophie", lastName: "Rey", role: "administration" as const, account: true },
      { email: "luc.perret@exemple.ch", firstName: "Luc", lastName: "Perret", role: "collaborateur" as const, account: false },
    ];
    const memberIds: string[] = [];
    for (const c of collaborators) {
      let accountId: string | null = null;
      if (c.account) {
        accountId = randomUUID();
        await db.insert(users).values({
          id: accountId,
          email: c.email,
          passwordHash: await hashPassword(DEMO_MEMBER.password),
          firstName: c.firstName,
          lastName: c.lastName,
          role: "member",
          createdAt: monthsAgo(2),
        });
        memberIds.push(accountId);
      }
      await db.insert(orgMembers).values({
        id: randomUUID(),
        ownerUserId: userId,
        email: c.email,
        name: `${c.firstName} ${c.lastName}`,
        role: c.role,
        status: c.account ? "active" : "invited",
        userId: accountId,
        invitedAt: monthsAgo(2),
        joinedAt: c.account ? monthsAgo(2) : null,
      });
    }

    // Historique d'usage sur six mois (déterministe) pour la titulaire et les collaborateurs
    const weights: Record<string, number> = { merge: 9, convert: 8, sign: 6, organize: 5, edit: 5, forms: 4, compress: 4, redact: 3, annotate: 3, ocr: 2, protect: 2, compare: 1 };
    const pool = USAGE_TOOLS.flatMap((t) => Array(weights[t] ?? 1).fill(t) as (typeof USAGE_TOOLS)[number][]);
    let seed = 42;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const actors = [userId, ...memberIds];
    const now = new Date();
    for (let day = 180; day >= 0; day--) {
      const date = new Date(now);
      date.setDate(now.getDate() - day);
      if (date.getDay() === 0 || date.getDay() === 6) continue; // pas d'activité le week-end
      const ramp = 0.5 + (180 - day) / 180; // usage croissant au fil des mois
      const ops = Math.round(rand() * 3 * ramp);
      for (let i = 0; i < ops; i++) {
        const tool = pool[Math.floor(rand() * pool.length)];
        const at = new Date(date);
        at.setHours(8 + Math.floor(rand() * 9), Math.floor(rand() * 60), 0, 0);
        await db.insert(usageEvents).values({
          id: randomUUID(),
          userId: actors[Math.floor(rand() * actors.length)],
          tool,
          pages: 1 + Math.floor(rand() * 24),
          createdAt: at,
        });
      }
    }
    console.log(`✔ Membre de démonstration créé : ${DEMO_MEMBER.email} (+ 2 collaborateurs, historique d'usage)`);
  } else if (!avecDemo) {
    console.log("· Données de démonstration écartées (production). SEED_DEMO=1 pour les créer quand même.");
  }
}

function monthsAgo(months: number, daysIntoMonth?: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  if (daysIntoMonth !== undefined) {
    // Début de période fixé quelques jours avant aujourd'hui pour que l'échéance soit à venir.
    d.setDate(Math.max(1, d.getDate() - daysIntoMonth));
  }
  d.setHours(10, 0, 0, 0);
  return d;
}

if (require.main === module) {
  runSeed()
    .then(() => {
      console.log("✔ Données initiales en place.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
