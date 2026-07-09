import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getMyProfile } from "@/lib/portal/data";
import {
  BasicsForm,
  ConsentForm,
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

  const { client, preferences, intake } = await getMyProfile();

  const basicsInitial: BasicsInitial | null = client
    ? {
        fullName: client.fullName,
        phone: client.phone ?? "",
        birthdate: client.birthdate.toISOString().slice(0, 10),
        gender: client.gender,
        city: client.city,
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

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 sm:p-10">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything here is only visible to you and your matchmaker.
          </p>
        </div>
        <Link href="/portal" className="text-sm hover:underline">
          ← Overview
        </Link>
      </header>

      <Section
        id="basics"
        title="Basic details"
        description="Who you are and how we can reach you."
      >
        <BasicsForm initial={basicsInitial} />
      </Section>

      <Section
        id="preferences"
        title="Match preferences"
        description={
          locked
            ? "Save your basic details first to unlock this section."
            : "Who you'd like us to look for."
        }
      >
        <PreferencesForm initial={preferencesInitial} disabled={locked} />
      </Section>

      <Section
        id="questionnaire"
        title="Compatibility questionnaire"
        description={
          locked
            ? "Save your basic details first to unlock this section."
            : "There are no right answers — honest ones make the best matches. You can skip any question."
        }
      >
        <QuestionnaireForm initial={intake} disabled={locked} />
      </Section>

      <Section
        id="consent"
        title="Consent"
        description={
          locked
            ? "Save your basic details first to unlock this section."
            : "We never introduce you to anyone without this."
        }
      >
        <ConsentForm
          initial={Boolean(client?.consentToIntroduce)}
          disabled={locked}
        />
      </Section>
    </main>
  );
}
