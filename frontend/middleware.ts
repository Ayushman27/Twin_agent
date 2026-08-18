import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const token = req.cookies.get("access_token")?.value;

  // NOTE: primary token storage in this scaffold is localStorage (see auth.service.ts),
  // which middleware cannot read. Swap to an httpOnly cookie for real deployments so this
  // check is authoritative; until then this middleware is a structural placeholder.
  if (!isPublic && !token) {
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
