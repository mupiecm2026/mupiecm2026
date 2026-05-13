import { NextRequest, NextResponse } from "next/server";
import { createKVStore } from "./lib/services/kv/kv-store.factory";

const PUBLIC_PATHS = [
  "/",
  "/checkout",
  "/not-found",
  "/termos-de-uso",
  "/politica-devolucao",
  "/produto",
  "/favoritos",
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
    const env = (globalThis as any).__ENV__ || (globalThis as any).process?.env || null;
    const kv = await createKVStore(env);
    const raw = await kv.get(`session:${token}`);
    
    if (!raw) return null;
    
    const session = JSON.parse(raw);
    if (session.expiresAt && new Date(session.expiresAt) <= new Date()) {
      await kv.delete(`session:${token}`);
      return null;
    }
    
    return { role: session.role };
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