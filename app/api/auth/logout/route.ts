import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authService } from "../../../../lib/services/auth-service";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("mupi_session")?.value;
    if (sessionCookie) {
      await authService.deleteSession(sessionCookie);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: "mupi_session",
      value: "",
      path: "/",
      expires: new Date(0),
      sameSite: "lax",
    });

    return response;
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
