"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { IntroStatus } from "@/db/schema";
import { advanceIntroduction } from "@/lib/staff/intro-actions";
import { IntroStatusBadge, cn } from "@/components/ui";
import { useDict } from "@/components/locale-provider";
import type { Dict } from "@/lib/i18n/dictionaries";

export interface BoardIntro {
  id: string;
  status: IntroStatus;
  clientAName: string;
  clientAId: string;
  clientBName: string;
  clientBId: string;
  initiatedByName: string;
  scheduledFor: string | null;
  updatedAt: string;
}

interface Column {
  key: string;
  title: string;
  statuses: IntroStatus[];
  /** Dropping a card here transitions to this status (omit = not a target). */
  dropTo?: IntroStatus;
  hint?: string;
}

function columns(t: Dict): Column[] {
  return [
    { key: "suggested", title: t.staff.colSuggested, statuses: ["suggested"] },
    { key: "proposed", title: t.staff.colProposed, statuses: ["proposed"], dropTo: "proposed" },
    {
      key: "accepted",
      title: t.staff.colAccepted,
      statuses: ["accepted_a", "accepted_b", "both_accepted"],
      dropTo: "both_accepted",
      hint: t.staff.colAcceptedHint,
    },
    {
      key: "scheduled",
      title: t.staff.colScheduled,
      statuses: ["date_scheduled"],
      dropTo: "date_scheduled",
      hint: t.staff.colScheduledHint,
    },
    { key: "met", title: t.staff.colMet, statuses: ["met"], dropTo: "met" },
    {
      key: "closed",
      title: t.staff.colClosed,
      statuses: ["success", "declined", "no_match"],
      hint: t.staff.colClosedHint,
    },
  ];
}

export function IntroBoard({ intros }: { intros: BoardIntro[] }) {
  const { t } = useDict();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);

  function onDrop(column: Column) {
    if (!dragged || !column.dropTo) return;
    const introId = dragged;
    const to = column.dropTo;
    setDragged(null);
    setError(null);
    startTransition(async () => {
      const result = await advanceIntroduction(introId, to);
      if (!result.ok) setError(result.error ?? t.staff.moveNotAllowed);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <div className={cn("grid gap-3 md:grid-cols-3 xl:grid-cols-6", pending && "opacity-60")}>
        {columns(t).map((col) => {
          const cards = intros.filter((i) => col.statuses.includes(i.status));
          return (
            <div
              key={col.key}
              onDragOver={(e) => col.dropTo && e.preventDefault()}
              onDrop={() => onDrop(col)}
              className={cn(
                "flex min-h-48 flex-col rounded-lg border border-black/10 p-2 dark:border-white/15",
                col.dropTo && dragged && "border-dashed border-black/40 dark:border-white/50",
              )}
            >
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {col.title}
                </h2>
                <span className="text-xs text-muted-foreground">{cards.length}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {cards.map((i) => (
                  <div
                    key={i.id}
                    draggable
                    onDragStart={() => setDragged(i.id)}
                    onDragEnd={() => setDragged(null)}
                    className="cursor-grab rounded-md border border-black/10 bg-background p-2 text-sm shadow-sm active:cursor-grabbing dark:border-white/15"
                  >
                    <Link href={`/introductions/${i.id}`} className="font-medium hover:underline">
                      {i.clientAName} × {i.clientBName}
                    </Link>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <IntroStatusBadge status={i.status} label={t.introStatus[i.status]} />
                      {i.scheduledFor && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(i.scheduledFor).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.staff.by} {i.initiatedByName}
                    </p>
                  </div>
                ))}
              </div>
              {col.hint && (
                <p className="mt-2 px-1 text-[11px] leading-tight text-muted-foreground">
                  {col.hint}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
