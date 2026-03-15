import fs from "node:fs";
import path from "node:path";
import { appSettingsSchema, appSettingsUpdateSchema, type AppSettings } from "@/lib/settings/schema";

const settingsDirectory = path.join(process.cwd(), ".data");
const settingsPath = path.join(settingsDirectory, "app-settings.json");

const defaultSettings = appSettingsSchema.parse({});

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
    return appSettingsSchema.parse(JSON.parse(rawContent));
  } catch {
    return defaultSettings;
  }
}

export async function saveAppSettings(input: AppSettings) {
  const validated = appSettingsUpdateSchema.parse(input);
  ensureSettingsDirectory();
  await fs.promises.writeFile(settingsPath, `${JSON.stringify(validated, null, 2)}\n`, "utf-8");
  return validated;
}
