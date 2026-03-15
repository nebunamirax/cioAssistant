import { NextResponse } from "next/server";
import { createBudgetItem, listBudgetItems } from "@/lib/services/budget-item-service";

function parseNumberParam(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await listBudgetItems({
      search: searchParams.get("search") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      fiscalYear: parseNumberParam(searchParams.get("fiscalYear"))
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = await createBudgetItem(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
