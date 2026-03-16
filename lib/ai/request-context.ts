import type { AIRequest } from "@/lib/ai/types";

export function buildAIContextBlock(context?: AIRequest["context"]) {
  if (!context) {
    return "";
  }

  const entries = Object.entries(context).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (entries.length === 0) {
    return "";
  }

  const serialized = entries
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join("\n");

  return `\n\n[CONTEXT]\n${serialized}`;
}
