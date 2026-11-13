import { currentMember, publicUrl } from "@/lib/auth/session";
import { recordControl } from "@/lib/services/support-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await currentMember();
  if (!actor) return new Response(null, { status: 401 });
  const { id } = await context.params;
  try {
    const form = await request.formData();
    await recordControl({
      serviceId: id,
      checkedAt: new Date(String(form.get("checkedAt")) + "T12:00:00Z").toISOString(),
      nextDueAt: new Date(String(form.get("nextDueAt")) + "T12:00:00Z").toISOString(),
      result: form.get("result"), evidence: form.get("evidence")
    }, actor);
    return Response.redirect(new URL(`/services/${id}`, publicUrl()), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Contrôle invalide", { status: 422 });
  }
}
