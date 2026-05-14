import { NextResponse } from "next/server";
import { authService } from "../../../../lib/services/auth/auth-service";
import { getSessionCookieOptions } from "../../../../lib/utils/cookie";
import { createJWT } from "../../../../lib/helpers/jwtHelper";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
    };

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const user = await authService.registerUser(
      email,
      password
    );

    const token = await createJWT({
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      user: {
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set(
      "mupi_session",
      token,
      getSessionCookieOptions()
    );

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao criar usuário.",
      },
      { status: 400 }
    );
  }
}