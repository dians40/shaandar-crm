import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeAuthSession, AUTH_COOKIE } from "@/lib/auth";
import {
  LAYER2_STAGING_HOME_HREF,
  isLayer2StagingApiPathAllowed,
  isLayer2StagingPathAllowed,
} from "@/lib/auth-navigation";
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

function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionRaw = request.cookies.get(AUTH_COOKIE)?.value;
  const session = decodeAuthSession(sessionRaw);
  const isAuthenticated = session !== null;
  const isProtected = isProtectedPath(pathname);
  const isApiRoute = pathname.startsWith("/api/");

  if ((isProtected || isApiRoute) && !isAuthenticated) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && isAuthenticated) {
    const redirectTarget = isLayer2StagingUser(session)
      ? LAYER2_STAGING_HOME_HREF
      : "/dashboard";
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  }

  if (isAuthenticated && isLayer2StagingUser(session)) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL(LAYER2_STAGING_HOME_HREF, request.url));
    }

    if (isApiRoute) {
      if (!isLayer2StagingApiPathAllowed(pathname)) {
        return NextResponse.json(
          { error: "Access denied. Layer 2 users are restricted to attendance staging APIs." },
          { status: 403 }
        );
      }
      return NextResponse.next();
    }

    const moduleParam = request.nextUrl.searchParams.get("module");
    if (isProtected && !isLayer2StagingPathAllowed(pathname, moduleParam)) {
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
    "/api/:path*",
  ],
};
