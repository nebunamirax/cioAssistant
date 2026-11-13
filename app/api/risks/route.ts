import { NextResponse } from "next/server";
import { RISK_LEVELS, RISK_STATUSES } from "@/lib/domain/constants";
import { createRisk, listRisks } from "@/lib/services/risk-service";

function parseEnumParam<T extends readonly string[]>(values: T, value: string | null): T[number] | undefined {
  if (!value) return undefined;
  return values.includes(value as T[number]) ? (value as T[number]) : undefined;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await listRisks({
      search: searchParams.get("search") ?? undefined,
      status: parseEnumParam(RISK_STATUSES, searchParams.get("status")),
      criticality: parseEnumParam(RISK_LEVELS, searchParams.get("criticality")),
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
    const data = await createRisk(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
