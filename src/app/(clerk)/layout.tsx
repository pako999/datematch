import { ClerkProvider } from "@clerk/nextjs";

// Clerk reads its keys per-request; keep these routes out of static
// prerendering so the app still builds without env configured.
export const dynamic = "force-dynamic";

export default function ClerkLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
