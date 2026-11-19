import fs from "node:fs";
import path from "node:path";
import { writeDataFile } from "@/lib/settings/shared-data";

export type OutlookConnection = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  accountEmail: string | null;
  accountName: string | null;
  connectedAt: string;
  lastSyncedAt: string | null;
};

const dataDirectory = path.join(process.cwd(), ".data");
const outlookConnectionPath = path.join(dataDirectory, "outlook-connection.json");

export function loadOutlookConnectionSync(): OutlookConnection | null {
  try {
    if (!fs.existsSync(outlookConnectionPath)) {
      return null;
    }

    const raw = fs.readFileSync(outlookConnectionPath, "utf-8");
    return JSON.parse(raw) as OutlookConnection;
  } catch {
    return null;
  }
}

export async function saveOutlookConnection(connection: OutlookConnection) {
  await writeDataFile(outlookConnectionPath, `${JSON.stringify(connection, null, 2)}\n`);
  return connection;
}

export async function clearOutlookConnection() {
  try {
    if (fs.existsSync(outlookConnectionPath)) {
      await fs.promises.unlink(outlookConnectionPath);
    }
  } catch {
    return;
  }
}

export function getOutlookConnectionPath() {
  return outlookConnectionPath;
}
