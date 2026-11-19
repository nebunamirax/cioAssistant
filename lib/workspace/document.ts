import { Worker } from "node:worker_threads";
import { join } from "node:path";
import { BusinessError } from "@/lib/business/error";

export async function workspaceContent(markdown: string, inputBlocks?: Record<string, unknown>[]) {
  return new Promise<{ contentMarkdown: string; blocksJson: string }>((resolve, reject) => {
    let replied = false;
    const worker = new Worker(join(process.cwd(), "scripts/workspace-content-worker.mjs"), {
      workerData: { markdown, blocks: inputBlocks },
      resourceLimits: { maxOldGenerationSizeMb: 192 }
    });
    const timeout = setTimeout(() => {
      void worker.terminate();
      reject(new BusinessError("Le traitement de la page a dépassé le délai autorisé.", 503));
    }, 10000);
    worker.once("message", (result) => {
      replied = true;
      if (result.error) reject(new BusinessError("Les blocs de la page sont invalides."));
      else resolve(result);
      void worker.terminate();
    });
    worker.once("error", () => reject(new BusinessError("Le traitement de la page est indisponible.", 503)));
    worker.once("exit", () => {
      clearTimeout(timeout);
      if (!replied) reject(new BusinessError("Le traitement de la page est indisponible.", 503));
    });
  });
}
