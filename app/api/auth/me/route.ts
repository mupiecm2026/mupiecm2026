import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJWT } from "../../../../lib/helpers/jwtHelper";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("mupi_session")?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const payload = await verifyJWT(token);

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