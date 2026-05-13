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

    const user = await authService.registerUser(email, password);
    const session = await authService.createSession(user.email);

    const res = NextResponse.json({ user: { email: user.email, role: user.role } });

    res.cookies.set("mupi_session", session.token, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: true,
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao criar usuário." }, { status: 400 });
  }
}
