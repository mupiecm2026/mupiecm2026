import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "./lib/helpers/jwtHelper";

const PUBLIC_PATHS = new Set([
  "/",
  "/checkout",
  "/not-found",
  "/termos-de-uso",
  "/politica-devolucao",
  "/produto",
  "/favoritos",
  "/politica-troca-cancelamento",
]);

const MASTER_PATHS = ["/config-page", "/dashboard", "/cashback"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }

  return [...PUBLIC_PATHS]
    .filter(path => path !== "/")
    .some(path => pathname.startsWith(path + "/"));
}

function isMaster(pathname: string): boolean {
  return MASTER_PATHS.some(
    path => pathname === path || pathname.startsWith(path + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore internal/static/api
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Public routes
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Read token
  const token = request.cookies.get("mupi_session")?.value;

  if (!token) {
    // console.log("🔐 MIDDLEWARE: Missing token");

    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const payload = await verifyJWT(token);

    const role = String(payload.role || "");

    // Protect master routes
    if (isMaster(pathname) && role !== "master") {
      // console.log(
      //   `🔐 MIDDLEWARE: Access denied for role "${role}" on "${pathname}"`
      // );

      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error(
      // "🔐 MIDDLEWARE: Invalid token",
      error instanceof Error ? error.message : error
    );

    const response = NextResponse.redirect(new URL("/", request.url));

    response.cookies.delete("mupi_session");

    return response;
  }
}

export const config = {
  matcher: ["/:path*"],
};