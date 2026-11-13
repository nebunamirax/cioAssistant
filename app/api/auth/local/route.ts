import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { publicUrl, sameOrigin, startSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60000);
  const user = await prisma.$transaction(async (db) => {
    // The first write acquires SQLite's writer lock before reading the counter.
    await db.loginAttempt.deleteMany({ where: { expiresAt: { lte: now } } });
    const attempt = await db.loginAttempt.findUnique({ where: { id: "local" } });
    if ((attempt?.failures ?? 0) >= 8) return null;
    const account = await db.user.findFirst({ where: { role: "DSI", enabled: true, passwordHash: { not: null }, tenantId: null, objectId: null } });
    if (account?.passwordHash && password.length <= 256 && verifyPassword(password, account.passwordHash)) {
      await db.loginAttempt.deleteMany({ where: { id: "local" } });
      return account.id;
    }
    await db.loginAttempt.upsert({ where: { id: "local" }, create: { id: "local", failures: 1, expiresAt }, update: { failures: { increment: 1 } } });
    return null;
  });
  if (user) await startSession(user);
  return NextResponse.redirect(new URL(user ? "/" : "/login?error=local", publicUrl()), 303);
}
