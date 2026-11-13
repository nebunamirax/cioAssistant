import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { entraConfig } from "@/lib/auth/entra";
import { publicUrl, startSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const jar = await cookies();
  const [state, nonce, verifier] = (jar.get("cio_oidc")?.value ?? "").split(".");
  jar.delete("cio_oidc");
  const fail = () => NextResponse.redirect(new URL("/login?error=microsoft", publicUrl()));
  const config = entraConfig();
  const query = new URL(request.url).searchParams;
  const code = query.get("code");
  if (!config || !state || !nonce || !verifier || state !== query.get("state") || !code) return fail();
  try {
    const token = await fetch(config.authority + "/oauth2/v2.0/token", {
      method: "POST", signal: AbortSignal.timeout(8000),
      body: new URLSearchParams({
        grant_type: "authorization_code", code, code_verifier: verifier, client_id: config.client,
        client_secret: config.secret, redirect_uri: config.callback
      })
    });
    if (!token.ok) return fail();
    const { id_token: idToken } = await token.json();
    const keys = createRemoteJWKSet(new URL(config.authority + "/discovery/v2.0/keys"));
    const { payload } = await jwtVerify(idToken, keys, {
      issuer: config.issuer, audience: config.client, algorithms: ["RS256"], requiredClaims: ["exp", "iat", "sub"]
    });
    if (payload.nonce !== nonce || payload.tid !== config.tenant || typeof payload.oid !== "string") return fail();
    const member = await prisma.user.findUnique({ where: { tenantId_objectId: { tenantId: config.tenant, objectId: payload.oid.toLowerCase() } } });
    if (!member?.enabled) return fail();
    await startSession(member.id);
    return NextResponse.redirect(new URL(member.role === "DSI" ? "/" : "/actions", publicUrl()), 303);
  } catch {
    return fail();
  }
}
