import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaffPage } from "@/lib/auth";
import { Card, EmptyState, SentimentBadge, formatDateTime } from "@/components/ui";

export default async function FeedbackPage() {
  await requireStaffPage();

  const rows = await db()
    .select()
    .from(schema.feedback)
    .orderBy(desc(schema.feedback.createdAt))
    .limit(100);

  const clientIds = [
    ...new Set(rows.flatMap((f) => [f.fromClientId, f.aboutClientId])),
  ];
  const clients =
    clientIds.length > 0
      ? await db()
          .select({ id: schema.clients.id, fullName: schema.clients.fullName })
          .from(schema.clients)
          .where(inArray(schema.clients.id, clientIds))
      : [];
  const nameById = new Map(clients.map((c) => [c.id, c.fullName]));

  const negatives = rows.filter((f) => f.sentiment === "negative");
  const rest = rows.filter((f) => f.sentiment !== "negative");

  function FeedbackList({ items }: { items: typeof rows }) {
    if (items.length === 0) return <EmptyState>Nothing here.</EmptyState>;
    return (
      <ul className="divide-y divide-black/5 dark:divide-white/10">
        {items.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
            <SentimentBadge sentiment={f.sentiment} />
            <span className="font-medium">{nameById.get(f.fromClientId) ?? "?"}</span>
            <span className="text-muted-foreground">about</span>
            <span className="font-medium">{nameById.get(f.aboutClientId) ?? "?"}</span>
            <span className="text-muted-foreground">· {f.rating}/5</span>
            {f.wantsSecondDate && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                wants 2nd date
              </span>
            )}
            {f.notes && <span className="text-muted-foreground">“{f.notes}”</span>}
            <span className="ml-auto flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {formatDateTime(f.createdAt)}
              </span>
              <Link
                href={`/introductions/${f.introductionId}`}
                className="text-xs underline"
              >
                intro →
              </Link>
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Feedback</h1>
      <Card title={`Needs follow-up (${negatives.length} negative)`}>
        <FeedbackList items={negatives} />
      </Card>
      <Card title="Recent feedback">
        <FeedbackList items={rest} />
      </Card>
    </div>
  );
}
