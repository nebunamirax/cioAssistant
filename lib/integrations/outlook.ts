import { randomBytes } from "node:crypto";
import { loadAppSettingsSync } from "@/lib/settings/service";
import {
  clearOutlookConnection,
  loadOutlookConnectionSync,
  saveOutlookConnection,
  type OutlookConnection
} from "@/lib/integrations/outlook-auth-store";

const OUTLOOK_SCOPES = ["offline_access", "openid", "profile", "User.Read", "Mail.Read"] as const;

type OutlookProfile = {
  displayName?: string | null;
  mail?: string | null;
  userPrincipalName?: string | null;
};

type OutlookMessage = {
  id: string;
  subject: string | null;
  receivedDateTime: string;
  bodyPreview?: string | null;
  categories?: string[] | null;
  from?: {
    emailAddress?: {
      address?: string | null;
      name?: string | null;
    } | null;
  } | null;
  internetMessageId?: string | null;
  isRead?: boolean;
  hasAttachments?: boolean;
  webLink?: string | null;
};

function requireOutlookSettings() {
  const settings = loadAppSettingsSync();

  if (!settings.integrations.outlookEnabled) {
    throw new Error("L'integration Outlook est desactivee.");
  }

  const tenantId = settings.integrations.outlookTenantId.trim();
  const clientId = settings.integrations.outlookClientId.trim();
  const clientSecret = settings.integrations.outlookClientSecret.trim();

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("La configuration Outlook est incomplete.");
  }

  return { tenantId, clientId, clientSecret };
}

function getTokenEndpoint(tenantId: string) {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
}

function getAuthorizeEndpoint(tenantId: string) {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
}

export function buildOutlookCallbackUrl(origin: string) {
  return `${origin}/api/integrations/outlook/callback`;
}

export function createOutlookOAuthState() {
  return randomBytes(24).toString("hex");
}

export function buildOutlookAuthorizationUrl(origin: string, state: string) {
  const { tenantId, clientId } = requireOutlookSettings();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: buildOutlookCallbackUrl(origin),
    response_mode: "query",
    scope: OUTLOOK_SCOPES.join(" "),
    state,
    prompt: "select_account"
  });

  return `${getAuthorizeEndpoint(tenantId)}?${params.toString()}`;
}

async function exchangeToken(params: URLSearchParams) {
  const { tenantId, clientId, clientSecret } = requireOutlookSettings();
  params.set("client_id", clientId);
  params.set("client_secret", clientSecret);

  const response = await fetch(getTokenEndpoint(tenantId), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString(),
    cache: "no-store"
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description ?? "Impossible d'obtenir un token Microsoft.");
  }

  return payload as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
}

async function fetchOutlookProfile(accessToken: string) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Impossible de lire le profil Microsoft.");
  }

  return payload as OutlookProfile;
}

function buildConnectionFromTokenResponse(input: {
  token: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  currentConnection?: OutlookConnection | null;
  profile: OutlookProfile;
}) {
  const now = new Date();

  return {
    accessToken: input.token.access_token,
    refreshToken: input.token.refresh_token ?? input.currentConnection?.refreshToken ?? "",
    expiresAt: new Date(now.getTime() + Math.max((input.token.expires_in ?? 3600) - 120, 60) * 1000).toISOString(),
    accountEmail: input.profile.mail ?? input.profile.userPrincipalName ?? input.currentConnection?.accountEmail ?? null,
    accountName: input.profile.displayName ?? input.currentConnection?.accountName ?? null,
    connectedAt: input.currentConnection?.connectedAt ?? now.toISOString(),
    lastSyncedAt: input.currentConnection?.lastSyncedAt ?? null
  } satisfies OutlookConnection;
}

export async function completeOutlookAuthorizationCodeFlow(input: {
  code: string;
  origin: string;
}) {
  const token = await exchangeToken(new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: buildOutlookCallbackUrl(input.origin),
    scope: OUTLOOK_SCOPES.join(" ")
  }));
  const profile = await fetchOutlookProfile(token.access_token);
  const connection = buildConnectionFromTokenResponse({
    token,
    profile
  });

  await saveOutlookConnection(connection);
  return connection;
}

export async function ensureOutlookAccessToken() {
  const connection = loadOutlookConnectionSync();

  if (!connection?.accessToken) {
    throw new Error("Aucune connexion Outlook active.");
  }

  if (new Date(connection.expiresAt).getTime() > Date.now()) {
    return connection.accessToken;
  }

  if (!connection.refreshToken) {
    throw new Error("La session Outlook a expire. Reconnecte Outlook pour relancer la synchronisation.");
  }

  const token = await exchangeToken(new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: connection.refreshToken,
    scope: OUTLOOK_SCOPES.join(" ")
  }));
  const profile = await fetchOutlookProfile(token.access_token);
  const updatedConnection = buildConnectionFromTokenResponse({
    token,
    currentConnection: connection,
    profile
  });

  await saveOutlookConnection(updatedConnection);
  return updatedConnection.accessToken;
}

export async function fetchLatestOutlookMessages(limit = 50) {
  const accessToken = await ensureOutlookAccessToken();
  const params = new URLSearchParams({
    "$top": String(limit),
    "$select": "id,subject,receivedDateTime,bodyPreview,categories,from,internetMessageId,isRead,hasAttachments,webLink",
    "$orderby": "receivedDateTime desc"
  });
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Impossible de lire les messages Outlook.");
  }

  return (payload?.value ?? []) as OutlookMessage[];
}

export async function markOutlookSyncTimestamp() {
  const connection = loadOutlookConnectionSync();

  if (!connection) {
    return null;
  }

  const updatedConnection: OutlookConnection = {
    ...connection,
    lastSyncedAt: new Date().toISOString()
  };

  await saveOutlookConnection(updatedConnection);
  return updatedConnection;
}

export function getOutlookConnectionStatus() {
  const settings = loadAppSettingsSync();
  const connection = loadOutlookConnectionSync();

  return {
    enabled: settings.integrations.outlookEnabled,
    configured: Boolean(
      settings.integrations.outlookTenantId.trim()
      && settings.integrations.outlookClientId.trim()
      && settings.integrations.outlookClientSecret.trim()
    ),
    connected: Boolean(connection?.accessToken),
    accountEmail: connection?.accountEmail ?? null,
    accountName: connection?.accountName ?? null,
    lastSyncedAt: connection?.lastSyncedAt ?? null,
    connectedAt: connection?.connectedAt ?? null
  };
}

export async function disconnectOutlook() {
  await clearOutlookConnection();
}
