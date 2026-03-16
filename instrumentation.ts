export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { startEmailAutomationWorker } = await import("@/lib/services/email-automation-service");
  startEmailAutomationWorker();
}
