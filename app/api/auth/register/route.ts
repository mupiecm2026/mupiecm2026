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

    const res = NextResponse.json({ success: true });

    res.cookies.set("mupi_session", "", {
      path: "/",
      expires: new Date(0),
    });

    return res;

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao criar usuário." }, { status: 400 });
  }
}
