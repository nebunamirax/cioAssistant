import { NextRequest, NextResponse } from "next/server";
import { getSession, publicUrl, sameOrigin, sessionCookie } from "@/lib/auth/session";

const apprenticePages = /^\/(?:actions|roadmap|services|weekly-review)(?:\/|$)/;
const apprenticeReads = /^\/api\/(?:actions|services)(?:\/|$)/;
const apprenticeWrites = [
  ["POST", /^\/api\/actions$/],
  ["PATCH", /^\/api\/actions\/[^/]+$/],
  ["POST", /^\/api\/actions\/[^/]+\/notes$/],
  ["POST", /^\/api\/services\/[^/]+\/controls$/]
] as const;

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login" || path.startsWith("/api/auth/") || path === "/api/v1/business" || path === "/api/mcp") return NextResponse.next();
  const api = path.startsWith("/api/");
  const member = await getSession(request.cookies.get(sessionCookie)?.value);
  if (!member) return api
    ? NextResponse.json({ error: "Connexion requise" }, { status: 401 })
    : NextResponse.redirect(new URL("/login", publicUrl()));
  const read = request.method === "GET" || request.method === "HEAD";
  if (!read && !sameOrigin(request)) return NextResponse.json({ error: "Origine refusée" }, { status: 403 });
  if (member.role === "DSI") return NextResponse.next();
  if (api) {
    if (read ? apprenticeReads.test(path) || path === "/api/workspace/search" : apprenticeWrites.some(([method, pattern]) => method === request.method && pattern.test(path))) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Accès DSI requis" }, { status: 403 });
  }
  if (apprenticePages.test(path)) return NextResponse.next();
  return NextResponse.redirect(new URL("/actions", publicUrl()), 303);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
