import fs from "node:fs";
import path from "node:path";
import { appSettingsSchema, appSettingsUpdateSchema, type AppSettings } from "@/lib/settings/schema";

const settingsDirectory = path.join(process.cwd(), ".data");
const settingsPath = path.join(settingsDirectory, "app-settings.json");

const defaultSettings = appSettingsSchema.parse({});

function normalizeSettings(input: AppSettings): AppSettings {
  const shouldPromoteCompatibleDefaults =
    input.ai.providerMode === "local"
    || (input.ai.providerMode === "compatible" && !input.ai.compatibleBaseUrl.trim() && !input.ai.compatibleModel.trim());

  if (!shouldPromoteCompatibleDefaults) {
    return input;
  }

  return {
    ...input,
    ai: {
      ...input.ai,
      providerMode: "compatible",
      compatibleBaseUrl: input.ai.compatibleBaseUrl.trim() || defaultSettings.ai.compatibleBaseUrl,
      compatibleModel: input.ai.compatibleModel.trim() || defaultSettings.ai.compatibleModel,
      compatibleModels: input.ai.compatibleModels.trim() || defaultSettings.ai.compatibleModels
    }
  };
}

function ensureSettingsDirectory() {
  if (!fs.existsSync(settingsDirectory)) {
    fs.mkdirSync(settingsDirectory, { recursive: true });
  }
}

export function getSettingsPath() {
  return settingsPath;
}

export function loadAppSettingsSync(): AppSettings {
  try {
    if (!fs.existsSync(settingsPath)) {
      return defaultSettings;
    }

    const rawContent = fs.readFileSync(settingsPath, "utf-8");
    return normalizeSettings(appSettingsSchema.parse(JSON.parse(rawContent)));
  } catch {
    return defaultSettings;
  }
}

export async function saveAppSettings(input: AppSettings) {
  const validated = normalizeSettings(appSettingsUpdateSchema.parse(input));
  ensureSettingsDirectory();
  await fs.promises.writeFile(settingsPath, `${JSON.stringify(validated, null, 2)}\n`, "utf-8");
  return validated;
}
