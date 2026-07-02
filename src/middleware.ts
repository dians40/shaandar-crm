import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

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
  const isAuthenticated = request.cookies.get(AUTH_COOKIE)?.value === "true";
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
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
