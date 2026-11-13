import { NextResponse } from "next/server";
import { DECISION_STATUSES } from "@/lib/domain/constants";
import { createDecision, listDecisions } from "@/lib/services/decision-service";

function parseEnumParam<T extends readonly string[]>(values: T, value: string | null): T[number] | undefined {
  if (!value) return undefined;
  return values.includes(value as T[number]) ? (value as T[number]) : undefined;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await listDecisions({
      search: searchParams.get("search") ?? undefined,
      status: parseEnumParam(DECISION_STATUSES, searchParams.get("status")),
      projectId: searchParams.get("projectId") ?? undefined
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = await createDecision(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
