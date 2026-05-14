import { NextResponse } from "next/server";
import { authService } from "../../../../lib/services/auth/auth-service";

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    console.log("🔍 DEBUG SESSION - Raw Cookies:", cookie);

    const token = cookie
      .split(";")
      .find(c => c.trim().startsWith("mupi_session="))
      ?.split("=")[1];

    console.log("🔍 DEBUG SESSION - Token from cookie:", token);

    if (!token) {
      return NextResponse.json({
        status: "error",
        message: "No session cookie found",
        cookies: cookie.split(";").map(c => c.trim()),
      });
    }

    const session = await authService.getSession(token);
    console.log("🔍 DEBUG SESSION - Session from DB:", session);

    if (!session) {
      return NextResponse.json({
        status: "error",
        message: "Session not found in DB",
        token,
      });
    }

    const user = await authService.getUserByEmail(session.email);
    console.log("🔍 DEBUG SESSION - User from DB:", user);

    return NextResponse.json({
      status: "ok",
      token,
      session,
      user: user
        ? {
            email: user.email,
            role: user.role,
          }
        : null,
    });
  } catch (error) {
    console.error("🔍 DEBUG SESSION - Error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
