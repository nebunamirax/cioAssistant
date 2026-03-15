import { NextResponse } from "next/server";
import { PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/domain/constants";
import { createProject, listProjects } from "@/lib/services/project-service";

function parseEnumParam<T extends readonly string[]>(values: T, value: string | null): T[number] | undefined {
  if (!value) {
    return undefined;
  }

  return values.includes(value as T[number]) ? (value as T[number]) : undefined;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await listProjects({
      search: searchParams.get("search") ?? undefined,
      type: parseEnumParam(PROJECT_TYPES, searchParams.get("type")),
      status: parseEnumParam(PROJECT_STATUSES, searchParams.get("status")),
      priority: parseEnumParam(PRIORITIES, searchParams.get("priority"))
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = await createProject(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
