import { publicUrl } from "@/lib/auth/session";
import { NextResponse } from "next/server";
import { startPlannerAuthorization } from "@/lib/integrations/planner";

export async function GET() {
  const origin = publicUrl().origin;
  try {
    const { url, state, verifier } = startPlannerAuthorization(origin);
    const response = NextResponse.redirect(url);
    response.cookies.set("planner_oauth", `${state}.${verifier}`, {
      httpOnly: true, sameSite: "lax", maxAge: 600, path: "/api/integrations/planner", secure: origin.startsWith("https:")
    });
    return response;
  } catch (error) {
    const target = new URL("/settings/integrations", origin);
    target.searchParams.set("plannerError", error instanceof Error ? error.message : "Connexion impossible.");
    return NextResponse.redirect(target);
  }
}
