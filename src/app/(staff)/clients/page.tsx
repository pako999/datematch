import Link from "next/link";
import { requireStaffPage } from "@/lib/auth";
import {
  listClients,
  listDistinctCities,
  listStaff,
} from "@/lib/staff/clients";
import { schema } from "@/db";
import { ClientStatusBadge, formatDate, ui } from "@/components/ui";
import { ageOn } from "@/lib/matching/score";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const staff = await requireStaffPage();
  const params = await searchParams;

  const status = schema.clientStatusEnum.enumValues.includes(
    params.status as schema.ClientStatus,
  )
    ? (params.status as schema.ClientStatus)
    : undefined;

  const [rows, cities, staffList] = await Promise.all([
    listClients({
      q: params.q,
      status,
      city: params.city,
      staffId: params.mine === "1" ? staff.id : params.staff,
    }),
    listDistinctCities(),
    listStaff(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Clients</h1>
        <Link href="/clients/new" className={ui.btnPrimary}>
          New client
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-2" method="get">
        <div>
          <label className={ui.label} htmlFor="q">Search</label>
          <input
            id="q"
            name="q"
            defaultValue={params.q}
            placeholder="Name or email"
            className={ui.input}
          />
        </div>
        <div>
          <label className={ui.label} htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={params.status ?? ""} className={ui.input}>
            <option value="">All</option>
            {schema.clientStatusEnum.enumValues.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={ui.label} htmlFor="city">City</label>
          <select id="city" name="city" defaultValue={params.city ?? ""} className={ui.input}>
            <option value="">All</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={ui.label} htmlFor="staff">Matchmaker</label>
          <select id="staff" name="staff" defaultValue={params.staff ?? ""} className={ui.input}>
            <option value="">All</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-1.5 pb-2 text-sm">
          <input type="checkbox" name="mine" value="1" defaultChecked={params.mine === "1"} />
          Mine only
        </label>
        <button type="submit" className={ui.btnSecondary}>Filter</button>
      </form>

      <div className={`${ui.card} overflow-x-auto`}>
        <table className="w-full border-collapse">
          <thead className="border-b border-black/10 dark:border-white/15">
            <tr>
              <th className={ui.th}>Name</th>
              <th className={ui.th}>Age</th>
              <th className={ui.th}>City</th>
              <th className={ui.th}>Status</th>
              <th className={ui.th}>Tier</th>
              <th className={ui.th}>Consent</th>
              <th className={ui.th}>Matchmaker</th>
              <th className={ui.th}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ client, assignedStaffName }) => (
              <tr
                key={client.id}
                className="border-b border-black/5 last:border-0 hover:bg-black/[.03] dark:border-white/10 dark:hover:bg-white/[.04]"
              >
                <td className={ui.td}>
                  <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                    {client.fullName}
                  </Link>
                </td>
                <td className={ui.td}>{ageOn(client.birthdate, new Date())}</td>
                <td className={ui.td}>{client.city}</td>
                <td className={ui.td}><ClientStatusBadge status={client.status} /></td>
                <td className={ui.td}>{client.membershipTier}</td>
                <td className={ui.td}>{client.consentToIntroduce ? "✓" : "—"}</td>
                <td className={ui.td}>{assignedStaffName ?? "Unassigned"}</td>
                <td className={ui.td}>{formatDate(client.updatedAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  No clients match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
