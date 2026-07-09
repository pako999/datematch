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

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaffPage();
  const { id } = await params;
  const detail = await getClientDetail(id);
  if (!detail) notFound();
  if (!canManageClient(staff, detail.client)) redirect(`/clients/${id}`);

  const { client, preferences, intake } = detail;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          Edit — {client.fullName}
        </h1>
        <Link href={`/clients/${id}`} className="text-sm hover:underline">
          ← Back to profile
        </Link>
      </div>

      <Card title="Basics">
        <StaffBasicsForm
          action={updateClientBasics.bind(null, id)}
          initial={{
            fullName: client.fullName,
            email: client.email,
            phone: client.phone ?? "",
            birthdate: client.birthdate.toISOString().slice(0, 10),
            gender: client.gender,
            city: client.city,
            lat: client.lat?.toString() ?? "",
            lng: client.lng?.toString() ?? "",
            bio: client.bio,
          }}
          submitLabel="Save basics"
        />
      </Card>

      <Card title="Preferences">
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

      <Card title="Compatibility questionnaire">
        <StaffIntakeForm action={updateClientIntake.bind(null, id)} initial={intake} />
      </Card>
    </div>
  );
}
