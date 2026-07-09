import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getMyProfile } from "@/lib/portal/data";
import { deleteMyPhoto } from "@/lib/portal/actions";
import { getI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  BasicsForm,
  ConsentForm,
  PhotoUploadForm,
  PreferencesForm,
  QuestionnaireForm,
  type BasicsInitial,
  type PreferencesInitial,
} from "./forms";

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-lg border border-black/10 p-5 dark:border-white/15"
    >
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { t } = await getI18n();
  const { client, preferences, intake, photos } = await getMyProfile();

  const basicsInitial: BasicsInitial | null = client
    ? {
        fullName: client.fullName,
        phone: client.phone ?? "",
        birthdate: client.birthdate.toISOString().slice(0, 10),
        gender: client.gender,
        city: client.city,
        country: client.country,
        bio: client.bio,
      }
    : null;

  const dealbreakers = (preferences?.dealbreakers ?? []) as {
    questionKey: string;
  }[];
  const mustHaves = (preferences?.mustHaves ?? []) as { questionKey: string }[];
  const preferencesInitial: PreferencesInitial | null = preferences
    ? {
        interestedInGenders: preferences.interestedInGenders,
        minAge: preferences.minAge,
        maxAge: preferences.maxAge,
        maxDistanceKm: preferences.maxDistanceKm,
        noSmokers: dealbreakers.some((d) => d.questionKey === "smoking"),
        partnerMustWantChildren: mustHaves.some(
          (m) => m.questionKey === "wants_children",
        ),
      }
    : null;

  const locked = !client;
  const lockedDesc = locked ? t.portal.sectionLocked : undefined;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 sm:p-10">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.portal.myProfile}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.portal.privacyNote}</p>
        </div>
        <span className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link href="/portal" className="text-sm hover:underline">
            ← {t.portal.overview}
          </Link>
        </span>
      </header>

      <Section
        id="basics"
        title={t.portal.sectionBasicsTitle}
        description={t.portal.sectionBasicsDesc}
      >
        <BasicsForm initial={basicsInitial} />
      </Section>

      <Section
        id="photos"
        title={t.portal.sectionPhotosTitle}
        description={lockedDesc ?? t.portal.sectionPhotosDesc}
      >
        {photos.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {photos.map((p) => (
              <figure key={p.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.isPrimary ? t.portal.yourPrimaryPhoto : t.portal.yourPhoto}
                  className="h-28 w-28 rounded-md object-cover"
                />
                <form action={deleteMyPhoto.bind(null, p.id)} className="absolute right-1 top-1">
                  <button
                    type="submit"
                    className="rounded bg-black/60 px-1.5 text-xs text-white"
                    title={t.portal.removePhoto}
                  >
                    ×
                  </button>
                </form>
              </figure>
            ))}
          </div>
        )}
        <PhotoUploadForm disabled={locked} />
      </Section>

      <Section
        id="preferences"
        title={t.portal.sectionPreferencesTitle}
        description={lockedDesc ?? t.portal.sectionPreferencesDesc}
      >
        <PreferencesForm initial={preferencesInitial} disabled={locked} />
      </Section>

      <Section
        id="questionnaire"
        title={t.portal.sectionQuestionnaireTitle}
        description={lockedDesc ?? t.portal.sectionQuestionnaireDesc}
      >
        <QuestionnaireForm initial={intake} disabled={locked} />
      </Section>

      <Section
        id="consent"
        title={t.portal.sectionConsentTitle}
        description={lockedDesc ?? t.portal.sectionConsentDesc}
      >
        <ConsentForm
          initial={Boolean(client?.consentToIntroduce)}
          disabled={locked}
        />
      </Section>
    </main>
  );
}
