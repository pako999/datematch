import { requireStaffPage } from "@/lib/auth";
import { listIntroductions } from "@/lib/staff/intros";
import { IntroBoard, type BoardIntro } from "@/components/intro-board";
import Link from "next/link";
import { getI18n } from "@/lib/i18n";

export default async function IntroductionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const staff = await requireStaffPage();
  const { t } = await getI18n();
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
        <h1 className="text-xl font-semibold tracking-tight">
          {t.staff.introductions}
        </h1>
        <div className="flex gap-3 text-sm">
          <Link
            href="/introductions"
            className={!mineOnly ? "font-semibold" : "text-muted-foreground hover:underline"}
          >
            {t.common.all}
          </Link>
          <Link
            href="/introductions?mine=1"
            className={mineOnly ? "font-semibold" : "text-muted-foreground hover:underline"}
          >
            {t.common.mine}
          </Link>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{t.staff.pipelineHint}</p>
      <IntroBoard intros={board} />
    </div>
  );
}
