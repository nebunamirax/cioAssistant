import mammoth from "mammoth";
import pdf from "pdf-parse";

const textExtensions = new Set(["txt", "md", "markdown", "csv", "json", "eml"]);

function getFileExtension(filename: string) {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1) ?? "" : "";
}

export async function extractTextFromFile(file: File) {
  const extension = getFileExtension(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (extension === "pdf" || file.type === "application/pdf") {
    const result = await pdf(buffer);
    return result.text.trim();
  }

  if (
    extension === "docx" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (textExtensions.has(extension) || file.type.startsWith("text/")) {
    return buffer.toString("utf-8").trim();
  }

  throw new Error("Format de document non pris en charge. Utilise un fichier texte, PDF ou DOCX.");
}
