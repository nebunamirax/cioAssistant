import { NextResponse } from "next/server";
import { COMMUNICATION_STATUSES } from "@/lib/domain/constants";
import { createCommunication, listCommunications } from "@/lib/services/communication-service";

function parseEnumParam<T extends readonly string[]>(values: T, value: string | null): T[number] | undefined {
  if (!value) {
    return undefined;
  }

  return values.includes(value as T[number]) ? (value as T[number]) : undefined;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await listCommunications({
      search: searchParams.get("search") ?? undefined,
      status: parseEnumParam(COMMUNICATION_STATUSES, searchParams.get("status")),
      type: searchParams.get("type") ?? undefined,
      projectId: searchParams.get("projectId") ?? undefined,
      actionId: searchParams.get("actionId") ?? undefined,
      contractId: searchParams.get("contractId") ?? undefined
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = await createCommunication(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
