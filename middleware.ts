import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/checkout",
  "/not-found",
  "/termos-de-uso",
  "/politica-devolucao",
  "/produto",
];

const MASTER_PATHS = ["/config-page", "/dashboard"];

function isPublic(path: string) {
  return PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "/"));
}

function isMaster(path: string) {
  return MASTER_PATHS.some(p => path === p || path.startsWith(p + "/"));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname) || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("mupi_session")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // validação leve (edge-safe)
  const looksValidJWT = token.split(".").length === 3;

  if (!looksValidJWT) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // proteção master (não confiável no edge, só bloqueio básico)
  if (isMaster(pathname)) {
    const hasJWTShape = token.startsWith("ey");

    if (!hasJWTShape) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico|api).*)"],
};