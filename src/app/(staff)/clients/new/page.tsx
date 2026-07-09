import { requireStaffPage } from "@/lib/auth";
import { createClient } from "@/lib/staff/actions";
import { StaffBasicsForm } from "@/components/staff-client-forms";
import { Card } from "@/components/ui";
import { getI18n } from "@/lib/i18n";

export default async function NewClientPage() {
  await requireStaffPage();
  const { t } = await getI18n();
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">{t.staff.newClientTitle}</h1>
      <p className="text-sm text-muted-foreground">{t.staff.newClientDesc}</p>
      <Card>
        <StaffBasicsForm
          action={createClient}
          initial={null}
          submitLabel={t.staff.createClient}
        />
      </Card>
    </div>
  );
}
