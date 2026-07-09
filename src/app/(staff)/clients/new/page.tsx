import { requireStaffPage } from "@/lib/auth";
import { createClient } from "@/lib/staff/actions";
import { StaffBasicsForm } from "@/components/staff-client-forms";
import { Card } from "@/components/ui";

export default async function NewClientPage() {
  await requireStaffPage();
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">New client</h1>
      <p className="text-sm text-muted-foreground">
        Creates a lead. Preferences, questionnaire, photos, and consent are
        completed on the client&apos;s profile afterwards — the intake is
        resumable at every step.
      </p>
      <Card>
        <StaffBasicsForm action={createClient} initial={null} submitLabel="Create client" />
      </Card>
    </div>
  );
}
