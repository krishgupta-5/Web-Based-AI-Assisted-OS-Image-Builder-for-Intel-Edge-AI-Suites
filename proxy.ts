import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';
import type { NextFetchEvent } from 'next/server';

// Routes that require authentication — unauthenticated users
// will be redirected to the Clerk sign-in page.
const isProtectedRoute = createRouteMatcher([
  '/settings(.*)',
]);

const clerkProxy = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return clerkProxy(request, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|mp3|wav|ogg)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
