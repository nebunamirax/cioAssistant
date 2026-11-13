import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { entraConfig } from "@/lib/auth/entra";
import { cookieOptions, publicUrl, randomSecret } from "@/lib/auth/session";

export async function GET() {
  const config = entraConfig();
  if (!config) return NextResponse.redirect(new URL("/login?error=microsoft", publicUrl()));
  const [state, nonce, verifier] = [randomSecret(), randomSecret(), randomSecret()];
  (await cookies()).set("cio_oidc", [state, nonce, verifier].join("."), { ...cookieOptions(), maxAge: 600 });
  const authorize = new URL(config.authority + "/oauth2/v2.0/authorize");
  authorize.search = new URLSearchParams({
    client_id: config.client, redirect_uri: config.callback, response_type: "code",
    scope: "openid profile", state, nonce, code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url")
  }).toString();
  return NextResponse.redirect(authorize);
}
