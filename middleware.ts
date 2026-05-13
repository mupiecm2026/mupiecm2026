import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/checkout",
  "/not-found",
  "/termos-de-uso",
  "/politica-devolucao",
  "/produto",
];

const MASTER_PATHS = ["/config-page", "/dashboard", "/cashback"];

function isPublic(path: string) {
  return PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "/"));
}

function isMaster(path: string) {
  return MASTER_PATHS.some(p => path === p || path.startsWith(p + "/"));
}

async function validateSession(token: string): Promise<{ role: string } | null> {
  try {
    // Call the /api/auth/me endpoint to validate session
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/me`, {
      headers: {
        'Cookie': `mupi_session=${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data : any = await response.json();
    return data.user ? { role: data.user.role } : null;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname) || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("mupi_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const session = await validateSession(token);
  if (!session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isMaster(pathname) && session.role !== "master") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico|api).*)"],
};