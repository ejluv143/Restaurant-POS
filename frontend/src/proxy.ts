import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, findStaffBySessionToken } from "@/lib/auth";
import { canAccess, homeFor, safeNextPath } from "@/lib/staffAccess";

// Gatekeeper for staff screens: validates the session against the database (so revoked or expired
// sessions stop working immediately) and enforces role access before anything renders.
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname.replace(/(.)\/$/, "$1");
  const staff = await findStaffBySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (path === "/login") {
    if (!staff) return NextResponse.next();
    return NextResponse.redirect(new URL(safeNextPath(request.nextUrl.searchParams.get("next"), staff.role), request.url));
  }

  if (!staff) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", path + request.nextUrl.search);
    const response = NextResponse.redirect(login);
    // Clear a stale or revoked cookie (same attributes as when set, or browsers ignore a __Host- deletion)
    if (request.cookies.has(SESSION_COOKIE)) response.cookies.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
    return response;
  }

  // A temporary password issued by an admin must be replaced before doing anything else
  if (staff.mustChangePassword && path !== "/account") return NextResponse.redirect(new URL("/account?required=1", request.url));
  if (!canAccess(staff.role, path)) return NextResponse.redirect(new URL(homeFor(staff.role), request.url));
  return NextResponse.next();
}

// Keep in sync with SCREENS in src/lib/staffAccess.ts. Guest pages (/, /order/...) and the APIs aren't matched.
export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/floor/:path*",
    "/kitchen/:path*",
    "/cashier/:path*",
    "/menu/:path*",
    "/tables/:path*",
    "/staff/:path*",
    "/reports/:path*",
    "/feedback/:path*",
    "/branches/:path*",
    "/audit/:path*",
    "/admin/:path*",
    "/account/:path*",
  ],
};
