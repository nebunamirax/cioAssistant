import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

export const sessionCookie = "cio_session";
export const memberSelect = { id: true, name: true, role: true, enabled: true } as const;
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const randomSecret = () => randomBytes(32).toString("base64url");
export const publicUrl = () => new URL(process.env.CIO_PUBLIC_URL || "http://localhost:3000");
export const cookieOptions = () => ({ httpOnly: true, sameSite: "lax" as const, secure: publicUrl().protocol === "https:", path: "/" });

export async function getSession(token?: string) {
  if (!token || token.length > 100) return null;
  const session = await prisma.session.findUnique({
    where: { hash: digest(token) },
    include: { user: { select: memberSelect } }
  });
  return session && session.expiresAt > new Date() && session.user.enabled ? session.user : null;
}

export async function currentMember() {
  return getSession((await cookies()).get(sessionCookie)?.value);
}

export async function requireMember(role?: "DSI") {
  const member = await currentMember();
  if (!member) redirect("/login");
  if (role && member.role !== role) redirect("/actions");
  return member;
}

export async function startSession(userId: string) {
  const token = randomSecret();
  const expiresAt = new Date(Date.now() + 8 * 3600000);
  await prisma.session.create({ data: { hash: digest(token), userId, expiresAt } });
  (await cookies()).set(sessionCookie, token, { ...cookieOptions(), expires: expiresAt });
}

export function sameOrigin(request: Request) {
  return request.headers.get("origin") === publicUrl().origin;
}
