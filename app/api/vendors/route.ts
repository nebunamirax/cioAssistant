import { NextResponse } from "next/server";
import { createVendor, listVendors } from "@/lib/services/vendor-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await listVendors({
      search: searchParams.get("search") ?? undefined,
      category: searchParams.get("category") ?? undefined
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = await createVendor(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
