import { publicUrl } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { completeOutlookAuthorizationCodeFlow } from "@/lib/integrations/outlook";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = publicUrl().origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("outlook_oauth_state")?.value;
  const returnTo = cookieStore.get("outlook_oauth_return_to")?.value === "/settings/integrations" ? "/settings/integrations" : "/emails";
  const finalizeRedirect = (redirectUrl: URL) => {
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("outlook_oauth_state", "", { maxAge: 0, path: "/" });
    response.cookies.set("outlook_oauth_return_to", "", { maxAge: 0, path: "/" });
    return response;
  };

  if (error) {
    const redirectUrl = new URL(returnTo, origin);
    redirectUrl.searchParams.set("m365Error", error);
    return finalizeRedirect(redirectUrl);
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    const redirectUrl = new URL(returnTo, origin);
    redirectUrl.searchParams.set("m365Error", "Etat OAuth Microsoft invalide.");
    return finalizeRedirect(redirectUrl);
  }

  try {
    await completeOutlookAuthorizationCodeFlow({
      code,
      origin: origin
    });
    const redirectUrl = new URL(returnTo, origin);
    redirectUrl.searchParams.set("m365", "connected");
    return finalizeRedirect(redirectUrl);
  } catch (callbackError) {
    const redirectUrl = new URL(returnTo, origin);
    redirectUrl.searchParams.set("m365Error", (callbackError as Error).message);
    return finalizeRedirect(redirectUrl);
  }
}
