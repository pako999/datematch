import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">DateMatch</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Personal matchmaking, done by humans. Create your profile and one of
          our matchmakers will take it from there.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/sign-up"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Create my profile
          </Link>
          <Link
            href="/sign-in"
            className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Sign in
          </Link>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          Agency staff:{" "}
          <Link href="/dashboard" className="underline">
            open the console
          </Link>
        </p>
      </div>
    </main>
  );
}
