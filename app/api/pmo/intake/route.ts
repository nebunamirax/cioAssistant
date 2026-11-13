import { currentMember } from "@/lib/auth/session";
import { applyPmoImport, PmoIntakeError, previewPmoImport } from "@/lib/services/pmo-intake-service";
import { pmoIntakeSchema, pmoLineLimit, pmoTextLimit } from "@/lib/validation/pmo-intake";

export async function POST(request: Request) {
  const member = await currentMember();
  if (!member || member.role !== "DSI") return Response.json({ error: "Accès DSI requis." }, { status: member ? 403 : 401 });
  try {
    const input = pmoIntakeSchema.safeParse(await request.json());
    if (!input.success) {
      return Response.json({ error: `Vérifiez le contenu ou la sélection. Le texte doit contenir de 10 à ${pmoTextLimit} caractères et au plus ${pmoLineLimit} lignes.` }, { status: 422 });
    }
    const data = input.data.mode === "preview"
      ? await previewPmoImport(input.data, member.id)
      : await applyPmoImport(input.data.importId, input.data.selected, member.id);
    return Response.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PmoIntakeError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return Response.json({ error: "Requête illisible." }, { status: 400 });
    return Response.json({ error: "Le serveur n’a pas pu traiter la mise à jour. Réessayez." }, { status: 503 });
  }
}
