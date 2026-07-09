import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything under /portal requires a signed-in Clerk user (self-service
// clients). Staff screens will get their own matcher + role check when
// they land; there are no other authenticated routes yet.
const isProtectedRoute = createRouteMatcher(["/portal(.*)"]);

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
