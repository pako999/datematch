"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { PENDING_STAFF_PREFIX, requireStaffAction } from "@/lib/auth";
import { runSeed } from "@/lib/seed-data";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const addSchema = z.object({
  email: z.string().trim().email().max(200).transform((e) => e.toLowerCase()),
  name: z.string().trim().min(2).max(200),
  role: z.enum(schema.staffRoleEnum.enumValues),
});

/** Admin pre-provisions a staff row; the Clerk id is claimed on first sign-in. */
export async function addStaffMember(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireStaffAction({ admin: true });
  const parsed = addSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  }

  const existing = await db().query.staff.findFirst({
    where: eq(schema.staff.email, parsed.data.email),
  });
  if (existing) return { ok: false, error: "That email is already staff" };

  await db().insert(schema.staff).values({
    id: `${PENDING_STAFF_PREFIX}${parsed.data.email}`,
    ...parsed.data,
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateStaffRole(
  staffId: string,
  formData: FormData,
): Promise<void> {
  const actor = await requireStaffAction({ admin: true });
  if (staffId === actor.id) {
    throw new Error("You can't change your own role");
  }
  const role = String(formData.get("role")) as schema.StaffRole;
  if (!schema.staffRoleEnum.enumValues.includes(role)) {
    throw new Error("Invalid role");
  }
  await db()
    .update(schema.staff)
    .set({ role })
    .where(eq(schema.staff.id, staffId));
  revalidatePath("/settings");
}

/**
 * Admin one-click demo data. Only fills an EMPTY roster (never wipes),
 * so it's safe to expose as a button; existing staff are preserved.
 */
export async function loadDemoData(
  _prev: ActionResult | null,
  _formData: FormData,
): Promise<ActionResult> {
  await requireStaffAction({ admin: true });
  const [row] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.clients);
  if ((row?.count ?? 0) > 0) {
    return {
      ok: false,
      error: "The roster isn't empty — demo data only loads into an empty database.",
    };
  }

  const summary = await runSeed(db(), { wipe: false });
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  revalidatePath("/introductions");
  revalidatePath("/settings");
  console.info(
    `Demo data loaded: ${summary.clients} clients, ${summary.scores} scores, ${summary.intros} intros`,
  );
  return { ok: true };
}

export async function removeStaffMember(staffId: string): Promise<void> {
  const actor = await requireStaffAction({ admin: true });
  if (staffId === actor.id) throw new Error("You can't remove yourself");
  // Clients keep their records: assigned_staff_id is ON DELETE SET NULL,
  // but notes/intros reference staff with NO ACTION — removal fails if
  // they authored history. Pending (never signed-in) rows always delete.
  await db().delete(schema.staff).where(eq(schema.staff.id, staffId));
  revalidatePath("/settings");
}
