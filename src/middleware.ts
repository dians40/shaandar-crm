import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeAuthSession, AUTH_COOKIE } from "@/lib/auth";
import { LAYER2_STAGING_HOME_HREF, isLayer2StagingPathAllowed } from "@/lib/auth-navigation";
import { isLayer2StagingUser } from "@/types/auth-session";

const protectedPrefixes = [
  "/dashboard",
  "/master-panel",
  "/user-management",
  "/transactions",
  "/display",
  "/report-generated",
  "/analysis",
  "/api-refresh",
  "/data-analysis",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionRaw = request.cookies.get(AUTH_COOKIE)?.value;
  const session = decodeAuthSession(sessionRaw);
  const isAuthenticated = session !== null;
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && isAuthenticated) {
    const redirectTarget = isLayer2StagingUser(session)
      ? LAYER2_STAGING_HOME_HREF
      : "/dashboard";
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  }

  if (isAuthenticated && isLayer2StagingUser(session) && isProtected) {
    const moduleParam = request.nextUrl.searchParams.get("module");
    if (!isLayer2StagingPathAllowed(pathname, moduleParam)) {
      return NextResponse.redirect(new URL(LAYER2_STAGING_HOME_HREF, request.url));
    }
    if (pathname.startsWith("/transactions") && !moduleParam) {
      return NextResponse.redirect(new URL(LAYER2_STAGING_HOME_HREF, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/master-panel/:path*",
    "/user-management/:path*",
    "/transactions/:path*",
    "/display/:path*",
    "/report-generated/:path*",
    "/analysis/:path*",
    "/api-refresh/:path*",
    "/data-analysis/:path*",
  ],
};
