import { NextResponse } from "next/server";
import { ACTION_STATUSES, PRIORITIES } from "@/lib/domain/constants";
import { createAction, listActions } from "@/lib/services/action-service";

function parseBooleanParam(value: string | null) {
  return value === "true" || value === "1";
}

function parseEnumParam<T extends readonly string[]>(values: T, value: string | null): T[number] | undefined {
  if (!value) {
    return undefined;
  }

  return values.includes(value as T[number]) ? (value as T[number]) : undefined;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await listActions({
      search: searchParams.get("search") ?? undefined,
      status: parseEnumParam(ACTION_STATUSES, searchParams.get("status")),
      priority: parseEnumParam(PRIORITIES, searchParams.get("priority")),
      overdueOnly: parseBooleanParam(searchParams.get("overdueOnly"))
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = await createAction(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
