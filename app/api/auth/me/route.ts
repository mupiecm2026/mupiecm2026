import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authService } from "../../../../lib/services/auth-service";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("mupi_session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ user: null });
    }

    const session = await authService.getSession(sessionCookie);
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const user = await authService.getUserByEmail(session.email);
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: { email: user.email, role: user.role } });
  } catch {
    return NextResponse.json({ user: null });
  }
}
