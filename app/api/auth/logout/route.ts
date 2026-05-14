import { NextResponse } from "next/server";
import { getSessionCookieDeleteOptions } from "../../../../lib/utils/cookie";

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set(
      getSessionCookieDeleteOptions()
    );

    return response;
  } catch {
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}