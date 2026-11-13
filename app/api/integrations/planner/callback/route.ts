import { publicUrl } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { finishPlannerAuthorization } from "@/lib/integrations/planner";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = publicUrl().origin;
  const target = new URL("/settings/integrations", origin);
  const [expectedState, verifier] = ((await cookies()).get("planner_oauth")?.value ?? "").split(".");
  const code = url.searchParams.get("code");

  try {
    if (!expectedState || !verifier || url.searchParams.get("state") !== expectedState) throw new Error("Session de connexion Planner invalide.");
    if (!code) throw new Error("L’autorisation Planner a été refusée.");
    await finishPlannerAuthorization(origin, code, verifier);
    target.searchParams.set("planner", "connected");
  } catch (error) {
    target.searchParams.set("plannerError", error instanceof Error ? error.message : "Connexion Planner impossible.");
  }
  const response = NextResponse.redirect(target);
  response.cookies.set("planner_oauth", "", { maxAge: 0, path: "/api/integrations/planner" });
  return response;
}
