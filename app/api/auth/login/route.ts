import { NextResponse } from "next/server";
import { authService } from "../../../../lib/services/auth-service";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email e senha são obrigatórios." }, { status: 400 });
    }

    const user = await authService.verifyUser(email, password);
    const session = await authService.createSession(user.email);

    const response = NextResponse.json({ user: { email: user.email, role: user.role } });
    response.cookies.set({
      name: "mupi_session",
      value: session.token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Falha ao entrar." }, { status: 401 });
  }
}
