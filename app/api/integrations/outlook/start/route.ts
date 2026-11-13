import { publicUrl } from "@/lib/auth/session";
import { NextResponse } from "next/server";
import { buildOutlookAuthorizationUrl, createOutlookOAuthState } from "@/lib/integrations/outlook";

export async function GET(request: Request) {
  const origin = publicUrl().origin;
  try {
    const url = new URL(request.url);
    const state = createOutlookOAuthState();
    const returnTo = url.searchParams.get("returnTo") === "/settings/integrations" ? "/settings/integrations" : "/emails";
    const redirectUrl = buildOutlookAuthorizationUrl(origin, state);
    const response = NextResponse.redirect(redirectUrl);

    response.cookies.set("outlook_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
      secure: publicUrl().protocol === "https:"
    });
    response.cookies.set("outlook_oauth_return_to", returnTo, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
      secure: publicUrl().protocol === "https:"
    });

    return response;
  } catch (error) {
    const url = new URL(request.url);
    url.pathname = "/emails";
    url.searchParams.set("m365Error", (error as Error).message);
    return NextResponse.redirect(new URL(url.pathname + url.search, origin));
  }
}
