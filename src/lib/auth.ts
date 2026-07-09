import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";

export type CurrentStaff = schema.Staff;

/** Id prefix for staff rows provisioned by an admin before first sign-in. */
export const PENDING_STAFF_PREFIX = "pending:";

/**
 * Resolve the signed-in Clerk user to a staff row, or null for non-staff
 * (portal clients, strangers). Handles two onboarding paths:
 *  - claim: an admin pre-created the row by email → swap in the real
 *    Clerk id on first sign-in (FKs cascade).
 *  - bootstrap: emails in ADMIN_BOOTSTRAP_EMAILS become admins on first
 *    sign-in so a fresh deployment isn't locked out.
 */
export async function getCurrentStaff(): Promise<CurrentStaff | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const byId = await db().query.staff.findFirst({
    where: eq(schema.staff.id, userId),
  });
  if (byId) return byId;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!email) return null;

  const byEmail = await db().query.staff.findFirst({
    where: eq(schema.staff.email, email),
  });
  if (byEmail) {
    if (byEmail.id.startsWith(PENDING_STAFF_PREFIX)) {
      const [claimed] = await db()
        .update(schema.staff)
        .set({ id: userId, name: user?.fullName ?? byEmail.name })
        .where(eq(schema.staff.email, email))
        .returning();
      return claimed ?? null;
    }
    // Same email, different Clerk id — a re-created Clerk account.
    // Don't silently take over the old row; an admin should sort it out.
    return null;
  }

  const bootstrapEmails = (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (bootstrapEmails.includes(email)) {
    const [created] = await db()
      .insert(schema.staff)
      .values({
        id: userId,
        email,
        name: user?.fullName ?? email,
        role: "admin",
      })
      .onConflictDoNothing()
      .returning();
    return created ?? null;
  }

  return null;
}

/** Page-level gate: redirects non-staff away. */
export async function requireStaffPage(): Promise<CurrentStaff> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/");
  return staff;
}

/** Action-level gate: throws (server actions can't redirect mid-mutation). */
export async function requireStaffAction(
  opts: { write?: boolean; admin?: boolean } = {},
): Promise<CurrentStaff> {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error("Not authorized");
  if (opts.admin && staff.role !== "admin") {
    throw new Error("Admin access required");
  }
  if (opts.write && staff.role === "readonly") {
    throw new Error("Your account is read-only");
  }
  return staff;
}

/** True when this staff member may edit the given client. */
export function canManageClient(
  staff: CurrentStaff,
  client: Pick<schema.Client, "assignedStaffId">,
): boolean {
  if (staff.role === "admin") return true;
  if (staff.role === "readonly") return false;
  return client.assignedStaffId === null || client.assignedStaffId === staff.id;
}
