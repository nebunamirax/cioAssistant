import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "CSV export planned" }, { status: 501 });
}
