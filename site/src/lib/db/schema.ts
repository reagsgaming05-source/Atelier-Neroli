import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

export const BILLING_INTERVALS = ["month", "year"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

/** Par carte, tout de suite — ou sur facture à 30 jours, après une offre. */
export const BILLING_MODES = ["card", "invoice"] as const;
export type BillingMode = (typeof BILLING_MODES)[number];

/** Le cycle de vie d'une offre, de la demande à la commande. */
export const QUOTE_STATUSES = ["demande", "envoye", "accepte", "refuse", "expire"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const ORGANISATION_TYPES = ["commune", "ecole", "etat", "autre"] as const;
export type OrganisationTypeValue = (typeof ORGANISATION_TYPES)[number];

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  role: text("role", { enum: ["member", "admin"] }).notNull().default("member"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(), // empreinte SHA-256 du jeton
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  priceMonthlyCents: integer("price_monthly_cents").notNull(),
  priceYearlyCents: integer("price_yearly_cents").notNull(),
  features: text("features", { mode: "json" }).$type<string[]>().notNull(),
  highlight: integer("highlight", { mode: "boolean" }).notNull().default(false),
  /** Plafond de postes compris dans la formule. 0 = sans plafond. */
  maxSeats: integer("max_seats").notNull().default(0),
  /** Souscription immédiate par carte. */
  allowCard: integer("allow_card", { mode: "boolean" }).notNull().default(true),
  /** Demande d'offre puis facture à 30 jours : le chemin d'achat du secteur public. */
  allowInvoice: integer("allow_invoice", { mode: "boolean" }).notNull().default(false),
  /** Formule sur devis : pas de souscription en ligne, contact commercial. */
  quoteOnly: integer("quote_only", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id),
    interval: text("interval", { enum: BILLING_INTERVALS }).notNull(),
    status: text("status", { enum: ["active", "canceled"] }).notNull().default("active"),
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).notNull().default(false),
    canceledAt: timestamp("canceled_at"),
    endedAt: timestamp("ended_at"),
    pendingPlanId: text("pending_plan_id").references(() => plans.id),
    pendingInterval: text("pending_interval", { enum: BILLING_INTERVALS }),
    paymentBrand: text("payment_brand"),
    paymentLast4: text("payment_last4"),
    /** « card » : prélevé à chaque échéance. « invoice » : facturé à 30 jours. */
    billingMode: text("billing_mode", { enum: BILLING_MODES }).notNull().default("card"),
    /** Postes annoncés à la commande. 0 quand la formule n'en compte pas. */
    seats: integer("seats").notNull().default(1),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("subscriptions_user_idx").on(t.userId), index("subscriptions_status_idx").on(t.status)],
);

export const invoices = sqliteTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("CHF"),
    status: text("status", { enum: ["paid", "open", "void", "refunded"] }).notNull().default("paid"),
    periodStart: timestamp("period_start"),
    periodEnd: timestamp("period_end"),
    issuedAt: timestamp("issued_at")
      .notNull()
      .$defaultFn(() => new Date()),
    /** Échéance de paiement. Vide pour un règlement par carte, déjà encaissé. */
    dueAt: timestamp("due_at"),
    paidAt: timestamp("paid_at"),
    paymentMode: text("payment_mode", { enum: BILLING_MODES }).notNull().default("card"),
    paymentBrand: text("payment_brand"),
    paymentLast4: text("payment_last4"),
    quoteId: text("quote_id"),
    /** Le numéro de bon de commande du client, qu'il veut revoir sur sa facture. */
    reference: text("reference"),
    /**
     * La référence structurée de la QR-facture : 27 chiffres dont le dernier
     * est une clé de contrôle. Calculée une fois et gardée telle quelle — elle
     * est imprimée chez le client et sert à rapprocher le paiement.
     */
    qrReference: text("qr_reference"),
    /* Le débiteur, figé au moment de l'émission : une commune qui déménage ne
       doit pas réécrire ses anciennes factures. */
    billName: text("bill_name"),
    billStreet: text("bill_street"),
    billZip: text("bill_zip"),
    billCity: text("bill_city"),
    billCountry: text("bill_country").default("CH"),
    billIde: text("bill_ide"),
  },
  (t) => [index("invoices_user_idx").on(t.userId), index("invoices_quote_idx").on(t.quoteId)],
);

/**
 * Une demande d'offre, puis l'offre elle-même.
 *
 * C'est le vrai chemin d'achat d'une collectivité : elle demande une offre, la
 * fait valider par sa Municipalité ou son service d'achat, émet un bon de
 * commande, et paie une facture à 30 jours. Aucun compte n'est nécessaire pour
 * demander : il se crée à l'acceptation, avec le mot de passe choisi à ce
 * moment-là.
 *
 * `token` est le secret du lien public : l'offre se consulte et s'accepte sans
 * connexion, comme un lien reçu par courriel.
 */
export const quotes = sqliteTable(
  "quotes",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull().unique(),
    token: text("token").notNull().unique(),
    status: text("status", { enum: QUOTE_STATUSES }).notNull().default("demande"),

    orgType: text("org_type", { enum: ORGANISATION_TYPES }).notNull(),
    orgName: text("org_name").notNull(),
    orgIde: text("org_ide"),
    street: text("street"),
    zip: text("zip"),
    city: text("city"),
    country: text("country").notNull().default("CH"),

    contactFirstName: text("contact_first_name").notNull(),
    contactLastName: text("contact_last_name").notNull(),
    contactRole: text("contact_role"),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),

    seats: integer("seats").notNull().default(1),
    message: text("message"),

    /** Renseignés par l'administration au moment de chiffrer. */
    planId: text("plan_id").references(() => plans.id),
    interval: text("interval", { enum: BILLING_INTERVALS }).notNull().default("year"),
    amountCents: integer("amount_cents").notNull().default(0),
    validUntil: timestamp("valid_until"),
    conditions: text("conditions"),
    internalNote: text("internal_note"),

    /** Renseignés par le client au moment d'accepter. */
    purchaseOrder: text("purchase_order"),

    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    subscriptionId: text("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
    invoiceId: text("invoice_id").references(() => invoices.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    sentAt: timestamp("sent_at"),
    acceptedAt: timestamp("accepted_at"),
    declinedAt: timestamp("declined_at"),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("quotes_status_idx").on(t.status), index("quotes_email_idx").on(t.contactEmail)],
);

/** Collaborateur·trice·s rattachés à une licence Établissement (invitation par e-mail). */
export const orgMembers = sqliteTable(
  "org_members",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: ["administration", "collaborateur"] }).notNull().default("collaborateur"),
    status: text("status", { enum: ["invited", "active"] }).notNull().default("invited"),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    invitedAt: timestamp("invited_at")
      .notNull()
      .$defaultFn(() => new Date()),
    joinedAt: timestamp("joined_at"),
  },
  (t) => [uniqueIndex("org_members_owner_email_idx").on(t.ownerUserId, t.email), index("org_members_user_idx").on(t.userId)],
);

export const USAGE_TOOLS = ["edit", "organize", "merge", "convert", "compress", "ocr", "sign", "protect", "redact", "forms", "annotate", "compare"] as const;
export type UsageTool = (typeof USAGE_TOOLS)[number];

/** Une opération effectuée avec un outil (alimente les statistiques d'usage). */
export const usageEvents = sqliteTable(
  "usage_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tool: text("tool", { enum: USAGE_TOOLS }).notNull(),
    pages: integer("pages").notNull().default(0),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("usage_events_user_idx").on(t.userId), index("usage_events_created_idx").on(t.createdAt)],
);

export const contactMessages = sqliteTable("contact_messages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  readAt: timestamp("read_at"),
});

/* ---------- Relations (API db.query) ---------- */

export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  invoices: many(invoices),
  sessions: many(sessions),
  orgMembers: many(orgMembers, { relationName: "owner" }),
  memberships: many(orgMembers, { relationName: "member" }),
  usageEvents: many(usageEvents),
}));

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  owner: one(users, { fields: [orgMembers.ownerUserId], references: [users.id], relationName: "owner" }),
  user: one(users, { fields: [orgMembers.userId], references: [users.id], relationName: "member" }),
}));

export const usageEventsRelations = relations(usageEvents, ({ one }) => ({
  user: one(users, { fields: [usageEvents.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions, { relationName: "plan" }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  plan: one(plans, { fields: [subscriptions.planId], references: [plans.id], relationName: "plan" }),
  pendingPlan: one(plans, {
    fields: [subscriptions.pendingPlanId],
    references: [plans.id],
    relationName: "pendingPlan",
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  user: one(users, { fields: [invoices.userId], references: [users.id] }),
  subscription: one(subscriptions, { fields: [invoices.subscriptionId], references: [subscriptions.id] }),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
  plan: one(plans, { fields: [quotes.planId], references: [plans.id] }),
  user: one(users, { fields: [quotes.userId], references: [users.id] }),
  subscription: one(subscriptions, { fields: [quotes.subscriptionId], references: [subscriptions.id] }),
  invoice: one(invoices, { fields: [quotes.invoiceId], references: [invoices.id] }),
}));

/* ---------- Types ---------- */

export type User = typeof users.$inferSelect;
export type SafeUser = Omit<User, "passwordHash">;
export type Plan = typeof plans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type OrgMember = typeof orgMembers.$inferSelect;
export type UsageEvent = typeof usageEvents.$inferSelect;
