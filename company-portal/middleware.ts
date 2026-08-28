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

  const token = req.cookies.get("admin_access_token")?.value || req.cookies.get("access_token")?.value;
  const userRole = req.cookies.get("admin_user_role")?.value || (req.cookies.get("admin_access_token") ? "ORG_ADMIN" : req.cookies.get("user_role")?.value);

  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/organization") ||
    pathname.startsWith("/settings");

  // If accessing a protected route without token -> redirect to /login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated but role is strictly EMPLOYEE without admin session -> block company dashboard access
  if (isProtectedRoute && token && !req.cookies.get("admin_access_token") && userRole === "EMPLOYEE") {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "employee_forbidden");
    return NextResponse.redirect(loginUrl);
  }

  // Allow root '/' to render the Landing page
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
