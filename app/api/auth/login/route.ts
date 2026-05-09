import { NextResponse } from "next/server";
import { SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
    };

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    // TODO: substituir por validação real (DB/API)
    const user = {
      email,
      role: "user",
    };

    const token = await new SignJWT({
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    const res = NextResponse.json({ user });

    res.cookies.set("mupi_session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: true,
    });

    return res;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao autenticar.";

    return NextResponse.json(
      { error: message },
      { status: 401 }
    );
  }
}