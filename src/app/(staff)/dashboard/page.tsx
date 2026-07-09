import Link from "next/link";
import { and, desc, eq, gt, inArray, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaffPage } from "@/lib/auth";
import {
  Card,
  ClientStatusBadge,
  EmptyState,
  IntroStatusBadge,
  SentimentBadge,
  formatDate,
  formatDateTime,
} from "@/components/ui";

const ACTION_STATUSES: schema.IntroStatus[] = [
  "suggested",
  "proposed",
  "both_accepted",
  "met",
];

export default async function DashboardPage() {
  const staff = await requireStaffPage();
  const now = Date.now();
  const proposedCutoff = new Date(now - 5 * 86_400_000);
  const feedbackCutoff = new Date(now - 7 * 86_400_000);
  const recentCutoff = new Date(now - 7 * 86_400_000);

  const [myClients, actionIntros, staleProposed, staleMet, recentFeedback] =
    await Promise.all([
      db()
        .select()
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.assignedStaffId, staff.id),
            inArray(schema.clients.status, ["lead", "active"]),
          ),
        )
        .orderBy(desc(schema.clients.updatedAt))
        .limit(12),
      db()
        .select()
        .from(schema.introductions)
        .where(
          and(
            eq(schema.introductions.initiatedByStaffId, staff.id),
            inArray(schema.introductions.status, ACTION_STATUSES),
          ),
        )
        .orderBy(schema.introductions.updatedAt)
        .limit(12),
      db()
        .select()
        .from(schema.introductions)
        .where(
          and(
            eq(schema.introductions.status, "proposed"),
            lt(schema.introductions.updatedAt, proposedCutoff),
          ),
        )
        .limit(12),
      db()
        .select()
        .from(schema.introductions)
        .where(
          and(
            eq(schema.introductions.status, "met"),
            lt(schema.introductions.updatedAt, feedbackCutoff),
          ),
        )
        .limit(12),
      db()
        .select()
        .from(schema.feedback)
        .where(gt(schema.feedback.createdAt, recentCutoff))
        .orderBy(desc(schema.feedback.createdAt))
        .limit(12),
    ]);

  const introIds = [
    ...new Set(
      [...actionIntros, ...staleProposed, ...staleMet].flatMap((i) => [
        i.clientAId,
        i.clientBId,
      ]),
    ),
    ...new Set(recentFeedback.flatMap((f) => [f.fromClientId, f.aboutClientId])),
  ];
  const names =
    introIds.length > 0
      ? await db()
          .select({ id: schema.clients.id, fullName: schema.clients.fullName })
          .from(schema.clients)
          .where(inArray(schema.clients.id, introIds))
      : [];
  const nameById = new Map(names.map((n) => [n.id, n.fullName]));
  const pairLabel = (i: schema.Introduction) =>
    `${nameById.get(i.clientAId) ?? "?"} × ${nameById.get(i.clientBId) ?? "?"}`;

  const staleAll = [...staleProposed, ...staleMet];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">
        Good day, {staff.name.split(" ")[0]}
      </h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`My clients (${myClients.length})`}>
          {myClients.length === 0 ? (
            <EmptyState>
              No assigned leads or active clients.{" "}
              <Link href="/clients" className="underline">Browse the roster</Link>.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/10">
              {myClients.map((c) => (
                <li key={c.id} className="flex items-center gap-2 py-2 text-sm">
                  <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
                    {c.fullName}
                  </Link>
                  <ClientStatusBadge status={c.status} />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {c.city} · updated {formatDate(c.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Intros needing action (${actionIntros.length})`}>
          {actionIntros.length === 0 ? (
            <EmptyState>Nothing waiting on you. 🎉</EmptyState>
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/10">
              {actionIntros.map((i) => (
                <li key={i.id} className="flex items-center gap-2 py-2 text-sm">
                  <Link href={`/introductions/${i.id}`} className="font-medium hover:underline">
                    {pairLabel(i)}
                  </Link>
                  <IntroStatusBadge status={i.status} />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDate(i.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Stale intros (${staleAll.length})`}>
          {staleAll.length === 0 ? (
            <EmptyState>No intros gathering dust.</EmptyState>
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/10">
              {staleAll.map((i) => (
                <li key={i.id} className="flex items-center gap-2 py-2 text-sm">
                  <Link href={`/introductions/${i.id}`} className="font-medium hover:underline">
                    {pairLabel(i)}
                  </Link>
                  <IntroStatusBadge status={i.status} />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {i.status === "proposed"
                      ? "awaiting answers > 5 days"
                      : "feedback missing > 7 days"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`New feedback (${recentFeedback.length})`}>
          {recentFeedback.length === 0 ? (
            <EmptyState>No feedback this week.</EmptyState>
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/10">
              {recentFeedback.map((f) => (
                <li key={f.id} className="flex items-center gap-2 py-2 text-sm">
                  <SentimentBadge sentiment={f.sentiment} />
                  <span>
                    <span className="font-medium">{nameById.get(f.fromClientId) ?? "?"}</span>{" "}
                    on {nameById.get(f.aboutClientId) ?? "?"} — {f.rating}/5
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(f.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
