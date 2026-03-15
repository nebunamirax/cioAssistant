import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Planned endpoint" }, { status: 501 });
}
