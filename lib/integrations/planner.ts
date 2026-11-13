import "server-only";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { loadAppSettingsSync } from "@/lib/settings/service";
import type { ExternalItemInput } from "@/lib/domain/external-tracking";

const scopes = "offline_access https://graph.microsoft.com/Tasks.Read https://graph.microsoft.com/User.ReadBasic.All";
const graph = "https://graph.microsoft.com";
const sessionPath = path.join(process.cwd(), ".data", "planner-connection.json");
const sessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string(),
  expiresAt: z.number(),
  registration: z.string()
});

function configuration() {
  const { outlookTenantId, outlookClientId, outlookClientSecret } = loadAppSettingsSync().integrations;
  const tenant = outlookTenantId.trim();
  const client = outlookClientId.trim();
  const secret = outlookClientSecret.trim();
  if (!/^[a-z0-9.-]+$/i.test(tenant) || !client || !secret) return null;
  return { tenant, client, secret, registration: `${tenant}:${client}` };
}

async function readSession() {
  try {
    const session = sessionSchema.parse(JSON.parse(await fs.readFile(sessionPath, "utf8")));
    return session.registration === configuration()?.registration ? session : null;
  } catch {
    return null;
  }
}

export async function plannerConnection() {
  return { configured: Boolean(configuration()), connected: Boolean(await readSession()) };
}

export function plannerCallbackUrl(origin: string) {
  return `${origin}/api/integrations/planner/callback`;
}

export function startPlannerAuthorization(origin: string) {
  const config = configuration();
  if (!config) throw new Error("Renseigne les identifiants Microsoft Entra dans les paramètres.");
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const params = new URLSearchParams({
    client_id: config.client,
    response_type: "code",
    redirect_uri: plannerCallbackUrl(origin),
    scope: scopes,
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256"
  });
  return { state, verifier, url: `https://login.microsoftonline.com/${config.tenant}/oauth2/v2.0/authorize?${params}` };
}

async function exchangeToken(params: URLSearchParams, previousRefresh = "") {
  const config = configuration();
  if (!config) throw new Error("La configuration Microsoft Entra est incomplète.");
  params.set("client_id", config.client);
  params.set("client_secret", config.secret);
  params.set("scope", scopes);
  const response = await fetch(`https://login.microsoftonline.com/${config.tenant}/oauth2/v2.0/token`, {
    method: "POST", body: params, cache: "no-store", signal: AbortSignal.timeout(15000)
  });
  const token = z.object({
    access_token: z.string().min(1),
    refresh_token: z.string().optional(),
    expires_in: z.number().optional()
  }).safeParse(await response.json().catch(() => null));
  if (!response.ok || !token.success) throw new Error("Connexion Planner expirée ou refusée. Reconnecte le compte Microsoft.");
  const session = {
    accessToken: token.data.access_token,
    refreshToken: token.data.refresh_token ?? previousRefresh,
    expiresAt: Date.now() + Math.max(30, (token.data.expires_in ?? 3600) - 90) * 1000,
    registration: config.registration
  };
  const temporary = `${sessionPath}.${randomBytes(8).toString("hex")}`;
  await fs.mkdir(path.dirname(sessionPath), { recursive: true });
  try {
    await fs.writeFile(temporary, JSON.stringify(session), { mode: 0o600 });
    await fs.rename(temporary, sessionPath);
  } finally {
    await fs.rm(temporary, { force: true });
  }
  return session.accessToken;
}

export async function finishPlannerAuthorization(origin: string, code: string, verifier: string) {
  await exchangeToken(new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    redirect_uri: plannerCallbackUrl(origin)
  }));
}

let refreshing: Promise<string> | undefined;

async function accessToken() {
  const session = await readSession();
  if (session && session.expiresAt > Date.now()) return session.accessToken;
  if (!session?.refreshToken) throw new Error("Connecte ou reconnecte ton compte Planner.");
  refreshing ??= exchangeToken(new URLSearchParams({
    grant_type: "refresh_token", refresh_token: session.refreshToken
  }), session.refreshToken).finally(() => { refreshing = undefined; });
  return refreshing;
}

async function graphRead(url: string, token: string) {
  const target = new URL(url, graph);
  if (target.origin !== graph || !target.pathname.startsWith("/v1.0/")) throw new Error("Pagination Microsoft Graph invalide.");
  const response = await fetch(target, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000)
  });
  if (response.status === 401) throw new Error("Session Planner expirée. Reconnecte ton compte Microsoft.");
  if (response.status === 403) throw new Error("Vérifie les permissions Microsoft et l’accès au plan.");
  if (!response.ok) throw new Error(`Microsoft Graph n’a pas répondu à la demande (${response.status}).`);
  return response.json() as Promise<unknown>;
}

async function collectPages<T>(url: string, token: string, schema: z.ZodType<T>) {
  const items: T[] = [];
  const visited = new Set<string>();
  const pageSchema = z.object({ value: z.array(schema), "@odata.nextLink": z.string().optional() });
  let next: string | undefined = url;
  while (next) {
    if (visited.has(next) || visited.size === 200) throw new Error("La pagination Microsoft Graph est incomplète.");
    visited.add(next);
    const page = pageSchema.parse(await graphRead(next, token));
    items.push(...page.value);
    next = page["@odata.nextLink"];
  }
  return items;
}

const planSchema = z.object({ id: z.string().min(1), title: z.string() });
const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  percentComplete: z.number().int().min(0).max(100),
  dueDateTime: z.string().datetime({ offset: true }).nullish(),
  priority: z.number().int().nullish(),
  assignments: z.record(z.unknown()).nullish()
});

export async function listPlannerPlans() {
  return collectPages("/v1.0/me/planner/plans", await accessToken(), planSchema);
}

export async function readPlannerPlan(planId: string) {
  const token = await accessToken();
  const encodedId = encodeURIComponent(planId);
  const base = `/v1.0/planner/plans/${encodedId}`;
  const [planData, tasks] = await Promise.all([
    graphRead(base, token),
    collectPages(`${base}/tasks`, token, taskSchema)
  ]);
  const plan = planSchema.parse(planData);
  const ids = Array.from(new Set(tasks.flatMap((task) => Object.keys(task.assignments ?? {}).filter((key) => !key.startsWith("@")))));
  const names = new Map<string, string>();
  for (let index = 0; index < ids.length; index += 8) {
    await Promise.all(ids.slice(index, index + 8).map(async (id) => {
      const user = await graphRead(`/v1.0/users/${encodeURIComponent(id)}?$select=displayName`, token).catch(() => null);
      const parsed = z.object({ displayName: z.string().nullish() }).safeParse(user);
      if (parsed.success && parsed.data.displayName) names.set(id, parsed.data.displayName);
    }));
  }
  const items = tasks.map((task): ExternalItemInput => ({
    externalId: task.id,
    title: task.title,
    status: task.percentComplete === 100 ? "DONE" : task.percentComplete === 0 ? "TODO" : "IN_PROGRESS",
    originalStatus: `${task.percentComplete} %`,
    progress: task.percentComplete,
    dueDate: task.dueDateTime ? new Date(task.dueDateTime) : null,
    priority: task.priority == null ? null : String(task.priority),
    assignees: Object.keys(task.assignments ?? {}).filter((key) => !key.startsWith("@")).map((id) => names.get(id) ?? "Utilisateur Microsoft non résolu").join(", "),
    url: `https://planner.cloud.microsoft/webui/plan/${encodedId}/view/board/task/${encodeURIComponent(task.id)}`
  }));
  return { plan, items };
}
