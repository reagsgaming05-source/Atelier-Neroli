"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function toggleMessageReadAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  const read = formData.get("read") === "1";
  if (typeof id !== "string") return;
  await db.update(contactMessages).set({ readAt: read ? new Date() : null }).where(eq(contactMessages.id, id));
  revalidatePath("/admin/messages");
}
