import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

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

    const { payload } = await jwtVerify(token, secret);

    return NextResponse.json({
      user: {
        email: payload.email,
        role: payload.role,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}