export function getSessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  };
}

export function getSessionCookieDeleteOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    name: "mupi_session",
    value: "",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}