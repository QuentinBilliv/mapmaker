import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInPage = createRouteMatcher(["/login(.*)", "/signup(.*)"]);
const isProtectedRoute = createRouteMatcher([
  "/account(.*)",
  "/dashboard",
  "/maps/:id/edit",
]);
const isHomePage = createRouteMatcher(["/"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authed = await convexAuth.isAuthenticated();
  if (isHomePage(request) && authed) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }
  if (isSignInPage(request) && authed) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }
  if (isProtectedRoute(request) && !authed) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
