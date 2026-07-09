import Link from "next/link";
import type { ClientStatus, IntroStatus, Sentiment } from "@/db/schema";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* Shared class recipes (dense internal-tool aesthetic, light+dark). */
export const ui = {
  input:
    "w-full rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50",
  label: "block text-xs font-medium uppercase tracking-wide text-muted-foreground",
  btn: "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50",
  btnPrimary:
    "inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50",
  btnSecondary:
    "inline-flex items-center gap-1.5 rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10 disabled:opacity-50",
  btnDanger:
    "inline-flex items-center gap-1.5 rounded-md border border-red-600/40 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-600/10 disabled:opacity-50 dark:text-red-400",
  card: "rounded-lg border border-black/10 dark:border-white/15",
  cardPad: "rounded-lg border border-black/10 p-4 dark:border-white/15",
  th: "px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground",
  td: "px-3 py-2 text-sm",
} as const;

export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(ui.cardPad, className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? (
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

const badgeBase =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

const CLIENT_STATUS_STYLES: Record<ClientStatus, string> = {
  lead: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  paused: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  matched: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  churned: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
};

export function ClientStatusBadge({
  status,
  label,
}: {
  status: ClientStatus;
  label?: string;
}) {
  return (
    <span className={cn(badgeBase, CLIENT_STATUS_STYLES[status])}>
      {label ?? status}
    </span>
  );
}

export const INTRO_STATUS_LABELS: Record<IntroStatus, string> = {
  suggested: "Suggested",
  proposed: "Proposed",
  accepted_a: "A accepted",
  accepted_b: "B accepted",
  both_accepted: "Both accepted",
  date_scheduled: "Date scheduled",
  met: "Met",
  success: "Success",
  declined: "Declined",
  no_match: "No match",
};

const INTRO_STATUS_STYLES: Record<IntroStatus, string> = {
  suggested: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  proposed: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  accepted_a: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  accepted_b: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  both_accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  date_scheduled: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  met: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  success: "bg-emerald-600/20 text-emerald-800 dark:text-emerald-200",
  declined: "bg-red-500/15 text-red-700 dark:text-red-300",
  no_match: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
};

export function IntroStatusBadge({
  status,
  label,
}: {
  status: IntroStatus;
  label?: string;
}) {
  return (
    <span className={cn(badgeBase, INTRO_STATUS_STYLES[status])}>
      {label ?? INTRO_STATUS_LABELS[status]}
    </span>
  );
}

const SENTIMENT_STYLES: Record<Sentiment, string> = {
  positive: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  neutral: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
  negative: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export function SentimentBadge({
  sentiment,
  label,
}: {
  sentiment: Sentiment;
  label?: string;
}) {
  return (
    <span className={cn(badgeBase, SENTIMENT_STYLES[sentiment])}>
      {label ?? sentiment}
    </span>
  );
}

/** Match-score tiers: how a matchmaker reads the number, not the decimal. */
export function scoreTier(score: number): {
  key: "strong" | "promising" | "stretch";
  cls: string;
} {
  if (score >= 75) {
    return { key: "strong", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" };
  }
  if (score >= 55) {
    return { key: "promising", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" };
  }
  return { key: "stretch", cls: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300" };
}

export function ScoreBadge({ score, label }: { score: number; label?: string }) {
  const tier = scoreTier(score);
  return (
    <span className={cn(badgeBase, tier.cls)} title={`${score}/100`}>
      {label ?? tier.key} · {Math.round(score)}
    </span>
  );
}

export function ClientLink({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  return (
    <Link href={`/clients/${id}`} className="font-medium hover:underline">
      {name}
    </Link>
  );
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
