import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { getMyProfile } from "@/lib/portal/data";
import { QUESTION_RULES } from "@/lib/matching/questions";

export default async function PortalHome() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { client, preferences, intake } = await getMyProfile();

  const answered = Object.keys(intake).length;
  const totalQuestions = Object.keys(QUESTION_RULES).length;

  const steps = [
    { label: "Basic details", done: Boolean(client), href: "/portal/profile#basics" },
    { label: "Match preferences", done: Boolean(preferences), href: "/portal/profile#preferences" },
    {
      label: `Compatibility questionnaire (${answered}/${totalQuestions})`,
      done: answered > 0,
      href: "/portal/profile#questionnaire",
    },
    {
      label: "Consent to introductions",
      done: Boolean(client?.consentToIntroduce),
      href: "/portal/profile#consent",
    },
  ];
  const complete = steps.every((s) => s.done);

  return (
    <main className="mx-auto max-w-2xl p-6 sm:p-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {client ? `Welcome, ${client.fullName.split(" ")[0]}` : "Welcome"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your matchmaking profile
          </p>
        </div>
        <UserButton />
      </header>

      <section className="rounded-lg border border-black/10 p-5 dark:border-white/15">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Profile completion
        </h2>
        <ul className="mt-4 space-y-3">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  s.done
                    ? "bg-emerald-600 text-white"
                    : "border border-black/20 dark:border-white/25"
                }`}
              >
                {s.done ? "✓" : ""}
              </span>
              <Link href={s.href} className="hover:underline">
                {s.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-black/10 pt-5 dark:border-white/15">
          {complete ? (
            <p className="text-sm">
              Your profile is complete. A matchmaker will review it and be in
              touch — we&apos;ll only ever introduce you with your consent.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              The more you complete, the better we can match you.
            </p>
          )}
          <Link
            href="/portal/profile"
            className="mt-4 inline-block rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            {client ? "Edit my profile" : "Start my profile"}
          </Link>
        </div>
      </section>
    </main>
  );
}
