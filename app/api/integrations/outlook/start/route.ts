import { NextResponse } from "next/server";
import { buildOutlookAuthorizationUrl, createOutlookOAuthState } from "@/lib/integrations/outlook";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const state = createOutlookOAuthState();
    const returnTo = url.searchParams.get("returnTo") || "/emails";
    const redirectUrl = buildOutlookAuthorizationUrl(url.origin, state);
    const response = NextResponse.redirect(redirectUrl);

    response.cookies.set("outlook_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: url.protocol === "https:"
    });
    response.cookies.set("outlook_oauth_return_to", returnTo, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: url.protocol === "https:"
    });

    return response;
  } catch (error) {
    const url = new URL(request.url);
    url.pathname = "/emails";
    url.searchParams.set("m365Error", (error as Error).message);
    return NextResponse.redirect(url);
  }
}
