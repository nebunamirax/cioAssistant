import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider-factory";

export async function POST(req: Request) {
  const { text } = await req.json();
  const provider = getAIProvider();
  const result = await provider.classify({ text });
  return NextResponse.json({ provider: provider.name, result });
}
