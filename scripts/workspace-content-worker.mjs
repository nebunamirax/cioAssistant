import { parentPort, workerData } from "node:worker_threads";
import { ServerBlockNoteEditor } from "@blocknote/server-util";
import { getDocument } from "@blocknote/server-util/dom";
import { workspaceBlockSchema } from "../lib/workspace/block-schema.ts";

try {
  const editor = ServerBlockNoteEditor.create({ schema: workspaceBlockSchema }, getDocument());
  const blocks = workerData.blocks ?? await editor.tryParseMarkdownToBlocks(workerData.markdown);
  const contentMarkdown = await editor.blocksToMarkdownLossy(blocks);
  if (contentMarkdown.length > 200000) throw new Error("Page trop longue.");
  parentPort.postMessage({ contentMarkdown, blocksJson: JSON.stringify(blocks) });
} catch {
  parentPort.postMessage({ error: true });
}
