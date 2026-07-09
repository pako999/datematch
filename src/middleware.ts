import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// /portal = self-service clients; the rest = staff console. Both need a
// signed-in Clerk user; staff role checks happen in the (staff) layout
// and in every server action (middleware has no DB access).
const isProtectedRoute = createRouteMatcher([
  "/portal(.*)",
  "/dashboard(.*)",
  "/clients(.*)",
  "/introductions(.*)",
  "/feedback(.*)",
  "/settings(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
