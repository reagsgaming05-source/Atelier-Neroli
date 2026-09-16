import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

export const BILLING_INTERVALS = ["month", "year"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

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
    paidAt: timestamp("paid_at"),
    paymentBrand: text("payment_brand"),
    paymentLast4: text("payment_last4"),
  },
  (t) => [index("invoices_user_idx").on(t.userId)],
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

/* ---------- Types ---------- */

export type User = typeof users.$inferSelect;
export type SafeUser = Omit<User, "passwordHash">;
export type Plan = typeof plans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type OrgMember = typeof orgMembers.$inferSelect;
export type UsageEvent = typeof usageEvents.$inferSelect;
