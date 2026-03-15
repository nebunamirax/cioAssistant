import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Markdown export planned" }, { status: 501 });
}
