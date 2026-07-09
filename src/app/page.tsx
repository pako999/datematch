export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          DateMatch — Matchmaking Console
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Internal staff tool. Data model and scoring engine are in place;
          staff auth and screens land in the next build steps.
        </p>
      </div>
    </main>
  );
}
