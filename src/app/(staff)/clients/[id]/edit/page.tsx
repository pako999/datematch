import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStaffPage, canManageClient } from "@/lib/auth";
import { getClientDetail } from "@/lib/staff/clients";
import {
  updateClientBasics,
  updateClientIntake,
  updateClientPreferences,
} from "@/lib/staff/actions";
import {
  StaffBasicsForm,
  StaffIntakeForm,
  StaffPreferencesForm,
} from "@/components/staff-client-forms";
import { Card } from "@/components/ui";
import { getI18n } from "@/lib/i18n";
import { fill } from "@/lib/i18n/dictionaries";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaffPage();
  const { t } = await getI18n();
  const { id } = await params;
  const detail = await getClientDetail(id);
  if (!detail) notFound();
  if (!canManageClient(staff, detail.client)) redirect(`/clients/${id}`);

  const { client, preferences, intake } = detail;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          {fill(t.staff.editTitle, { name: client.fullName })}
        </h1>
        <Link href={`/clients/${id}`} className="text-sm hover:underline">
          ← {t.staff.backToProfile}
        </Link>
      </div>

      <Card title={t.staff.basics}>
        <StaffBasicsForm
          action={updateClientBasics.bind(null, id)}
          initial={{
            fullName: client.fullName,
            email: client.email,
            phone: client.phone ?? "",
            birthdate: client.birthdate.toISOString().slice(0, 10),
            gender: client.gender,
            city: client.city,
            country: client.country,
            bio: client.bio,
          }}
          submitLabel={t.staff.saveBasics}
        />
      </Card>

      <Card title={t.staff.preferences}>
        <StaffPreferencesForm
          action={updateClientPreferences.bind(null, id)}
          initial={
            preferences
              ? {
                  interestedInGenders: preferences.interestedInGenders,
                  minAge: preferences.minAge,
                  maxAge: preferences.maxAge,
                  maxDistanceKm: preferences.maxDistanceKm,
                  dealbreakersJson: JSON.stringify(preferences.dealbreakers),
                  mustHavesJson: JSON.stringify(preferences.mustHaves),
                }
              : null
          }
        />
      </Card>

      <Card title={t.staff.questionnaire}>
        <StaffIntakeForm action={updateClientIntake.bind(null, id)} initial={intake} />
      </Card>
    </div>
  );
}
