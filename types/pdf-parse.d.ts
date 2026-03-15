declare module "pdf-parse" {
  type PDFParseResult = {
    text: string;
  };

  export default function pdf(buffer: Buffer): Promise<PDFParseResult>;
}
