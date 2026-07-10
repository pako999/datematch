import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// /portal = self-service clients; the rest = staff console. Both need a
// signed-in Clerk user; staff role checks happen in the (staff) layout
// and in every server action (middleware has no DB access).
const isProtectedRoute = createRouteMatcher([
  "/portal(.*)",
  "/dashboard(.*)",
  "/clients(.*)",
  "/introductions(.*)",
  "/events(.*)",
  "/feedback(.*)",
  "/settings(.*)",
]);

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

// Without Clerk keys the whole site would 500 (clerkMiddleware throws on
// init). Degrade instead: public pages render, and every protected page
// still fails closed — their layouts/actions call auth(), which errors
// without Clerk, so no data is ever served unauthenticated.
const middleware = clerkConfigured
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect();
      }
    })
  : function middlewareWithoutClerk() {
      console.warn(
        "Clerk env vars missing (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY) — auth is not configured.",
      );
      return NextResponse.next();
    };

export default middleware;

export const config = {
  matcher: [
    // Skip Next.js internals and static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
