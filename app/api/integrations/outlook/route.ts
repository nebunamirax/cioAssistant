import { NextResponse } from "next/server";
import { buildOutlookCallbackUrl, disconnectOutlook, getOutlookConnectionStatus } from "@/lib/integrations/outlook";
import { syncAndProcessInboxEmails } from "@/lib/services/email-automation-service";
import { loadAppSettingsSync } from "@/lib/settings/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const settings = loadAppSettingsSync();

  return NextResponse.json({
    data: {
      ...getOutlookConnectionStatus(),
      automation: {
        pollingEnabled: settings.integrations.outlookPollingEnabled,
        pollingIntervalMinutes: settings.integrations.outlookPollingIntervalMinutes,
        automationEnabled: settings.integrations.outlookAutomationEnabled,
        automationCategory: settings.integrations.outlookAutomationCategory
      },
      callbackUrl: buildOutlookCallbackUrl(url.origin)
    }
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));

    if (payload.action !== "sync") {
      return NextResponse.json({ error: "Action Outlook non supportee." }, { status: 400 });
    }

    const result = await syncAndProcessInboxEmails(50);

    return NextResponse.json({
      data: {
        ...result,
        ...getOutlookConnectionStatus()
      }
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE() {
  await disconnectOutlook();
  return NextResponse.json({
    data: getOutlookConnectionStatus()
  });
}
