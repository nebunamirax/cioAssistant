import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const dataDirectory = join(process.cwd(), ".data");

export async function writeDataFile(path: string, contents: string) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  try {
    await writeFile(temporary, contents, { flag: "wx", mode: 0o600 });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

export class MicrosoftOperationBusy extends Error {
  constructor() {
    super("Une opération Microsoft est déjà en cours. Réessaie dans quelques instants.");
  }
}

export async function withMicrosoftLock<T>(integration: "outlook" | "planner", work: () => Promise<T>): Promise<T> {
  if (process.env.CIO_SHARED_APP_DATA !== "true") return work();

  await mkdir(dataDirectory, { recursive: true });
  const path = join(dataDirectory, `.${integration}.lock`);
  // The child holds the lock on the shared volume until its stdin closes, including
  // when the application process exits unexpectedly.
  const lock = spawn("flock", ["--no-fork", "--timeout", "3", "--conflict-exit-code", "75", path,
    "sh", "-c", "printf 'locked\\n'; exec cat >/dev/null"], {
    stdio: ["pipe", "pipe", "ignore"]
  });
  lock.stdin.on("error", () => {});
  const closed = new Promise<number | null>((resolve) => lock.once("close", resolve));
  const acquired = new Promise<boolean>((resolve) => {
    lock.stdout.once("data", () => resolve(true));
    lock.once("error", () => resolve(false));
    void closed.then(() => resolve(false));
  });
  try {
    if (!await acquired) {
      if (await closed === 75) throw new MicrosoftOperationBusy();
      throw new Error("Impossible de verrouiller les données Microsoft partagées.");
    }
    return await work();
  } finally {
    lock.stdin.end();
    await closed;
  }
}
