import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET debe tener al menos 32 caracteres");
  return new TextEncoder().encode(s);
};

export type AdminSession = { role: "admin"; uid: string; username: string };
export type ClientSession = {
  role: "client"; accountId: string; profileIds: string[];
  stage: "choose" | "full"; profileId?: string;
};

export async function setSession(name: string, payload: object, maxAgeSec: number) {
  const jwt = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt().setExpirationTime(`${maxAgeSec}s`).sign(secret());
  (await cookies()).set(name, jwt, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: maxAgeSec
  });
}
export async function readSession<T>(name: string): Promise<T | null> {
  const v = (await cookies()).get(name)?.value;
  if (!v) return null;
  try { return (await jwtVerify(v, secret())).payload as unknown as T; } catch { return null; }
}
export async function clearSession(name: string) { (await cookies()).delete(name); }

export const getAdmin = async () => {
  const s = await readSession<AdminSession>("ip_admin");
  return s?.role === "admin" ? s : null;
};
export const getClient = async () => {
  const s = await readSession<ClientSession>("ip_client");
  return s?.role === "client" ? s : null;
};
