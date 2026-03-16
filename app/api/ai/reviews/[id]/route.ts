import { NextResponse } from "next/server";

import { aiIntakeReviewSuggestSchema } from "@/lib/validation/ai-intake-review";
import { resolveAIIntakeReview, suggestAIIntakeReviewDraft, updateAIIntakeReview } from "@/lib/services/ai-intake-review-service";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const payload = await request.json();
    const data = await updateAIIntakeReview(params.id, payload);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const payload = await request.json();
    const suggest = aiIntakeReviewSuggestSchema.safeParse(payload);

    if (suggest.success) {
      const data = await suggestAIIntakeReviewDraft(params.id, suggest.data.selectedModule);
      return NextResponse.json({ data });
    }

    const data = await resolveAIIntakeReview(params.id, payload);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
