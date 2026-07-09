import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaffPage, PENDING_STAFF_PREFIX } from "@/lib/auth";
import { listStaff } from "@/lib/staff/clients";
import { removeStaffMember, updateStaffRole } from "@/lib/staff/staff-actions";
import { AddStaffForm, LoadDemoDataForm } from "@/components/settings-forms";
import { Card, ui } from "@/components/ui";
import { COMPONENT_WEIGHTS, QUESTION_RULES } from "@/lib/matching/questions";

export default async function SettingsPage() {
  const me = await requireStaffPage();
  const staffList = await listStaff();
  const isAdmin = me.role === "admin";
  const [clientCountRow] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.clients);
  const clientCount = clientCountRow?.count ?? 0;

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <Card title="Staff & roles">
        <div className={`${ui.card} overflow-x-auto`}>
          <table className="w-full border-collapse">
            <thead className="border-b border-black/10 dark:border-white/15">
              <tr>
                <th className={ui.th}>Name</th>
                <th className={ui.th}>Email</th>
                <th className={ui.th}>Role</th>
                <th className={ui.th}>Status</th>
                {isAdmin && <th className={ui.th}></th>}
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => {
                const pending = s.id.startsWith(PENDING_STAFF_PREFIX);
                return (
                  <tr key={s.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                    <td className={ui.td}>{s.name}{s.id === me.id ? " (you)" : ""}</td>
                    <td className={ui.td}>{s.email}</td>
                    <td className={ui.td}>
                      {isAdmin && s.id !== me.id ? (
                        <form action={updateStaffRole.bind(null, s.id)} className="flex gap-1">
                          <select name="role" defaultValue={s.role} className={ui.input}>
                            <option value="admin">admin</option>
                            <option value="matchmaker">matchmaker</option>
                            <option value="readonly">readonly</option>
                          </select>
                          <button type="submit" className={ui.btnSecondary}>Set</button>
                        </form>
                      ) : (
                        s.role
                      )}
                    </td>
                    <td className={ui.td}>
                      {pending ? (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          awaiting first sign-in
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">active</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className={ui.td}>
                        {s.id !== me.id && (
                          <form action={removeStaffMember.bind(null, s.id)}>
                            <button type="submit" className={ui.btnDanger}>Remove</button>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {isAdmin && (
          <div className="mt-4">
            <AddStaffForm />
          </div>
        )}
      </Card>

      <Card title="Scoring configuration (read-only)">
        <p className="mb-3 text-sm text-muted-foreground">
          Component weights: intake {COMPONENT_WEIGHTS.intake * 100}% · semantic{" "}
          {COMPONENT_WEIGHTS.semantic * 100}% · must-haves{" "}
          {COMPONENT_WEIGHTS.mustHaves * 100}% · proximity{" "}
          {COMPONENT_WEIGHTS.proximity * 100}%. Question weights live in{" "}
          <code className="text-xs">src/lib/matching/questions.ts</code> and are
          versioned with the code so every score is reproducible.
        </p>
        <div className={`${ui.card} overflow-x-auto`}>
          <table className="w-full border-collapse">
            <thead className="border-b border-black/10 dark:border-white/15">
              <tr>
                <th className={ui.th}>Question</th>
                <th className={ui.th}>Rule</th>
                <th className={ui.th}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(QUESTION_RULES).map(([key, rule]) => (
                <tr key={key} className="border-b border-black/5 last:border-0 dark:border-white/10">
                  <td className={ui.td}>{rule.label}</td>
                  <td className={ui.td}>{rule.type}</td>
                  <td className={ui.td}>{rule.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {isAdmin && clientCount === 0 && (
        <Card title="Demo data">
          <p className="mb-3 text-sm text-muted-foreground">
            The roster is empty. Load 10 labelled test personas with real
            engine-computed match scores and sample introductions so you can
            click through the whole workflow. Safe: it never overwrites
            existing data and your staff account is untouched.
          </p>
          <LoadDemoDataForm />
        </Card>
      )}

      <Card title="Account">
        <p className="text-sm text-muted-foreground">
          Signed in as {me.email} ({me.role}). Manage your password, sessions,
          and two-factor auth from the avatar menu in the sidebar.
        </p>
      </Card>
    </div>
  );
}
