import { requireStaffPage } from "@/lib/auth";
import { listIntroductions } from "@/lib/staff/intros";
import { IntroBoard, type BoardIntro } from "@/components/intro-board";
import Link from "next/link";

export default async function IntroductionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const staff = await requireStaffPage();
  const params = await searchParams;
  const mineOnly = params.mine === "1";

  const intros = await listIntroductions({
    staffId: mineOnly ? staff.id : undefined,
  });

  const board: BoardIntro[] = intros.map((i) => ({
    id: i.id,
    status: i.status,
    clientAName: i.clientA.fullName,
    clientAId: i.clientA.id,
    clientBName: i.clientB.fullName,
    clientBId: i.clientB.id,
    initiatedByName: i.initiatedByName,
    scheduledFor: i.scheduledFor?.toISOString() ?? null,
    updatedAt: i.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Introductions</h1>
        <div className="flex gap-3 text-sm">
          <Link
            href="/introductions"
            className={!mineOnly ? "font-semibold" : "text-muted-foreground hover:underline"}
          >
            All
          </Link>
          <Link
            href="/introductions?mine=1"
            className={mineOnly ? "font-semibold" : "text-muted-foreground hover:underline"}
          >
            Mine
          </Link>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Drag a card to advance it through the pipeline. Anything ambiguous
        (one-sided acceptance, scheduling, outcomes) happens on the intro page.
      </p>
      <IntroBoard intros={board} />
    </div>
  );
}
