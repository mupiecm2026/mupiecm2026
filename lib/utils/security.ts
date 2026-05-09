const base64Encode = (buffer: ArrayBuffer | Uint8Array) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return typeof btoa !== "undefined" ? btoa(binary) : "";
};

export const createSalt = () => {
  const random = typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function"
    ? (crypto as any).randomUUID()
    : Math.random().toString(36).slice(2, 18);
  return random.replace(/-/g, "").slice(0, 16);
};

export async function hashPassword(password: string, salt?: string) {
  const actualSalt = salt || createSalt();
  const encoder = new TextEncoder();
  const input = encoder.encode(`${actualSalt}:${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", input);
  const hash = base64Encode(hashBuffer);
  return { salt: actualSalt, hash };
}

export async function verifyPassword(password: string, salt: string, hash: string) {
  const result = await hashPassword(password, salt);
  return result.hash === hash;
}

export function createSessionToken() {
  if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
    return (crypto as any).randomUUID();
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
