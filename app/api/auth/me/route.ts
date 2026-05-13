import { NextResponse } from "next/server";
import { authService } from "../../../../lib/services/auth/auth-service";


export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const token = cookie
      .split(";")
      .find(c => c.trim().startsWith("mupi_session="))
      ?.split("=")[1];

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const session = await authService.getSession(token);
    if (!session) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        email: session.email,
        role: session.role,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}