import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { digest, publicUrl, sameOrigin, sessionCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const jar = await cookies();
  const token = jar.get(sessionCookie)?.value;
  if (token) await prisma.session.deleteMany({ where: { hash: digest(token) } });
  jar.delete(sessionCookie);
  return NextResponse.redirect(new URL("/login", publicUrl()), 303);
}
