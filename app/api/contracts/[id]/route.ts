import { NextResponse } from "next/server";
import { deleteContract, getContractById, updateContract } from "@/lib/services/contract-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params: paramsPromise }: RouteContext) {
  const params = await paramsPromise;
  const data = await getContractById(params.id);

  if (!data) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: Request, { params: paramsPromise }: RouteContext) {
  const params = await paramsPromise;
  try {
    const payload = await request.json();
    const data = await updateContract(params.id, payload);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params: paramsPromise }: RouteContext) {
  const params = await paramsPromise;
  try {
    await deleteContract(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
