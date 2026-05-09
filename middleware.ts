import { NextRequest, NextResponse } from "next/server";
import { authService } from "./lib/services/auth-service";

const PUBLIC_PATHS = ["/", "/checkout", "/not-found", "/termos-de-uso", "/politica-devolucao", "/produto"];
const MASTER_PATHS = ["/config-page", "/dashboard"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("mupi_session")?.value;
  if (!sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const session = await authService.getSession(sessionToken);
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (MASTER_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"))) {
    if (session.role !== "master") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico|api).*)"],
  runtime: "nodejs",
};
