import "./env";
import { randomUUID } from "node:crypto";
import { eq, notInArray } from "drizzle-orm";
import { db } from "../src/lib/db";
import { invoices, plans, subscriptions, users } from "../src/lib/db/schema";
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

  // 3. Membre de démonstration avec un abonnement et un historique de factures
  const demo = await db.query.users.findFirst({ where: eq(users.email, DEMO_MEMBER.email) });
  if (!demo) {
    const pro = await db.query.plans.findFirst({ where: eq(plans.slug, "pro") });
    if (!pro) throw new Error("Formule 'pro' introuvable.");

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
        description: `${offset === 3 ? "Abonnement" : "Renouvellement"} Pro — mensuel`,
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
    console.log(`✔ Membre de démonstration créé : ${DEMO_MEMBER.email}`);
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
