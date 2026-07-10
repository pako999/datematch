import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaffPage, PENDING_STAFF_PREFIX } from "@/lib/auth";
import { listStaff } from "@/lib/staff/clients";
import { removeStaffMember, updateStaffRole } from "@/lib/staff/staff-actions";
import {
  AddStaffForm,
  BackfillEmbeddingsForm,
  LoadDemoDataForm,
} from "@/components/settings-forms";
import { Card, ui } from "@/components/ui";
import { COMPONENT_WEIGHTS, QUESTION_RULES } from "@/lib/matching/questions";
import { getI18n } from "@/lib/i18n";
import { fill, questionLabel } from "@/lib/i18n/dictionaries";

export default async function SettingsPage() {
  const me = await requireStaffPage();
  const { t } = await getI18n();
  const staffList = await listStaff();
  const isAdmin = me.role === "admin";
  const [clientCountRow] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.clients);
  const clientCount = clientCountRow?.count ?? 0;

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">{t.staff.settings}</h1>

      <Card title={t.staff.staffRoles}>
        <div className={`${ui.card} overflow-x-auto`}>
          <table className="w-full border-collapse">
            <thead className="border-b border-black/10 dark:border-white/15">
              <tr>
                <th className={ui.th}>{t.common.name}</th>
                <th className={ui.th}>{t.common.email}</th>
                <th className={ui.th}>{t.staff.role}</th>
                <th className={ui.th}>{t.common.status}</th>
                {isAdmin && <th className={ui.th}></th>}
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => {
                const pending = s.id.startsWith(PENDING_STAFF_PREFIX);
                return (
                  <tr key={s.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                    <td className={ui.td}>
                      {s.name}
                      {s.id === me.id ? ` ${t.staff.you}` : ""}
                    </td>
                    <td className={ui.td}>{s.email}</td>
                    <td className={ui.td}>
                      {isAdmin && s.id !== me.id ? (
                        <form action={updateStaffRole.bind(null, s.id)} className="flex gap-1">
                          <select name="role" defaultValue={s.role} className={ui.input}>
                            <option value="admin">admin</option>
                            <option value="matchmaker">matchmaker</option>
                            <option value="readonly">readonly</option>
                          </select>
                          <button type="submit" className={ui.btnSecondary}>
                            {t.staff.set}
                          </button>
                        </form>
                      ) : (
                        s.role
                      )}
                    </td>
                    <td className={ui.td}>
                      {pending ? (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          {t.staff.awaitingSignIn}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          {t.staff.activeStatus}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className={ui.td}>
                        {s.id !== me.id && (
                          <form action={removeStaffMember.bind(null, s.id)}>
                            <button type="submit" className={ui.btnDanger}>
                              {t.common.remove}
                            </button>
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

      <Card title={t.staff.scoringConfig}>
        <p className="mb-3 text-sm text-muted-foreground">
          {fill(t.staff.scoringConfigText, {
            intake: COMPONENT_WEIGHTS.intake * 100,
            semantic: COMPONENT_WEIGHTS.semantic * 100,
            mustHaves: COMPONENT_WEIGHTS.mustHaves * 100,
            proximity: COMPONENT_WEIGHTS.proximity * 100,
          })}
        </p>
        <div className={`${ui.card} overflow-x-auto`}>
          <table className="w-full border-collapse">
            <thead className="border-b border-black/10 dark:border-white/15">
              <tr>
                <th className={ui.th}>{t.staff.question}</th>
                <th className={ui.th}>{t.staff.rule}</th>
                <th className={ui.th}>{t.staff.weight}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(QUESTION_RULES).map(([key, rule]) => (
                <tr key={key} className="border-b border-black/5 last:border-0 dark:border-white/10">
                  <td className={ui.td}>{questionLabel(t, key, rule.label)}</td>
                  <td className={ui.td}>{rule.type}</td>
                  <td className={ui.td}>{rule.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {isAdmin && (
        <Card title={t.staff.embeddingsCard}>
          <p className="mb-3 text-sm text-muted-foreground">{t.staff.embeddingsText}</p>
          <BackfillEmbeddingsForm />
        </Card>
      )}

      {isAdmin && clientCount === 0 && (
        <Card title={t.staff.demoData}>
          <p className="mb-3 text-sm text-muted-foreground">{t.staff.demoDataText}</p>
          <LoadDemoDataForm />
        </Card>
      )}

      <Card title={t.staff.account}>
        <p className="text-sm text-muted-foreground">
          {fill(t.staff.accountText, { email: me.email, role: me.role })}
        </p>
      </Card>
    </div>
  );
}
