import { NextResponse } from "next/server";
import { getAIConfiguration } from "@/lib/ai/config";
import { getAIProvider } from "@/lib/ai/provider-factory";
import { loadAppSettingsSync } from "@/lib/settings/service";

export async function GET() {
  const configuration = getAIConfiguration();
  const provider = getAIProvider();
  const settings = loadAppSettingsSync();

  return NextResponse.json({
    provider: provider.info,
    configuration,
    settings
  });
}
