import { NextResponse } from "next/server";
import { CONTRACT_STATUSES, RENEWAL_TYPES } from "@/lib/domain/constants";
import { createContract, listContracts } from "@/lib/services/contract-service";

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
    const data = await listContracts({
      search: searchParams.get("search") ?? undefined,
      status: parseEnumParam(CONTRACT_STATUSES, searchParams.get("status")),
      renewalType: parseEnumParam(RENEWAL_TYPES, searchParams.get("renewalType")),
      expiringOnly: parseBooleanParam(searchParams.get("expiringOnly"))
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = await createContract(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
