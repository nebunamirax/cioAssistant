import { publicUrl } from "./session";

export function entraConfig() {
  const tenant = process.env.ENTRA_TENANT_ID?.toLowerCase();
  const client = process.env.ENTRA_CLIENT_ID;
  const secret = process.env.ENTRA_CLIENT_SECRET;
  if (!tenant || !/^[a-f0-9-]{36}$/.test(tenant) || !client || !secret) return null;
  const issuer = `https://login.microsoftonline.com/${tenant}/v2.0`;
  const authority = `https://login.microsoftonline.com/${tenant}`;
  const callback = new URL("/api/auth/entra/callback", publicUrl()).href;
  return { tenant, client, secret, issuer, authority, callback };
}
