import { NextResponse } from "next/server";
import { deleteVendor, getVendorById, updateVendor } from "@/lib/services/vendor-service";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_: Request, { params }: RouteContext) {
  const data = await getVendorById(params.id);

  if (!data) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const payload = await request.json();
    const data = await updateVendor(params.id, payload);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    await deleteVendor(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
