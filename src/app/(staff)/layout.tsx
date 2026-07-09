import Link from "next/link";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/introductions", label: "Introductions" },
  { href: "/feedback", label: "Feedback" },
  { href: "/settings", label: "Settings" },
];

export default async function StaffLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const staff = await getCurrentStaff();

  return (
    <ClerkProvider>
      {staff ? (
        <div className="flex min-h-screen">
          <aside className="flex w-52 shrink-0 flex-col border-r border-black/10 p-4 dark:border-white/15">
            <Link href="/dashboard" className="text-base font-semibold tracking-tight">
              DateMatch
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">Staff console</p>
            <nav className="mt-6 flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto flex items-center gap-2 pt-6">
              <UserButton />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{staff.name}</p>
                <p className="text-xs text-muted-foreground">{staff.role}</p>
              </div>
            </div>
          </aside>
          <div className="min-w-0 flex-1 p-6">{children}</div>
        </div>
      ) : (
        <main className="flex min-h-screen items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold">No staff access</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account isn&apos;t registered as agency staff. If you&apos;re a
              client, head to your profile instead. If you should have staff
              access, ask an administrator to add you in Settings.
            </p>
            <Link href="/portal" className="mt-4 inline-block text-sm underline">
              Go to my client profile
            </Link>
          </div>
        </main>
      )}
    </ClerkProvider>
  );
}
