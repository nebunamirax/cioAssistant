import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(24).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const expected = Buffer.from(hash, "hex");
  return expected.length === 64 && timingSafeEqual(expected, scryptSync(password, salt, 64));
}
