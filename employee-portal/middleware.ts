import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static files, Next internals, and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("access_token")?.value;
  const userRole = req.cookies.get("user_role")?.value;
  const orgId = req.cookies.get("organization_id")?.value;

  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/twins") ||
    pathname.startsWith("/agents") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/approvals") ||
    pathname.startsWith("/knowledge") ||
    pathname.startsWith("/integrations") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/settings");

  const isEmployeeRole = userRole && userRole !== "ORG_ADMIN" && userRole !== "SUPER_ADMIN";
  const hasValidOrg = !!orgId;

  // If user is at /login or /register and already has a valid employee session with organization -> redirect to /dashboard
  if (isAuthRoute && token && isEmployeeRole && hasValidOrg) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // If accessing a protected route without token -> redirect to /login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated as an ORG_ADMIN -> block employee portal access
  if (isProtectedRoute && token && (userRole === "ORG_ADMIN" || userRole === "SUPER_ADMIN")) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "admin_restricted");
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated as employee but has NO organization association -> block dashboard access
  if (isProtectedRoute && token && !hasValidOrg) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "no_organization");
    return NextResponse.redirect(loginUrl);
  }

  // Allow root '/' to render the Landing page
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
