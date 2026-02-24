/**
 * Server-side file parser utility.
 *
 * Accepts a raw file (as a Buffer + filename) and extracts plain-text content
 * that can be fed into the Claude analysis pipeline.
 *
 * Supported formats:
 *  - .txt        → UTF-8 passthrough
 *  - .doc/.docx  → UTF-8 passthrough (plain-text only; OOXML not fully parsed)
 *  - .xlsx/.xls  → SheetJS row-by-row extraction
 *  - .pdf        → pdf-parse text extraction
 */

import * as XLSX from "xlsx";

const SUPPORTED_EXTENSIONS = [".txt", ".doc", ".docx", ".xlsx", ".xls", ".pdf"];

export function isSupportedFile(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

export function getExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf(".")).toLowerCase();
}

/**
 * Extract human-readable text from a file buffer.
 * Throws if the file type is unsupported or parsing fails.
 */
export async function extractText(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = getExtension(filename);

  switch (ext) {
    case ".txt":
    case ".doc":
    case ".docx":
      return buffer.toString("utf-8");

    case ".xlsx":
    case ".xls":
      return extractExcelText(buffer);

    case ".pdf":
      return extractPdfText(buffer);

    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Convert Excel workbook into readable text.
 *
 * Strategy: iterate every sheet, convert each row to CSV-like text,
 * then join with newlines. This gives Claude a clear tabular picture
 * of the data — headings in the first row, values below.
 */
function extractExcelText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Convert to array-of-arrays (header row included)
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (rows.length === 0) continue;

    if (workbook.SheetNames.length > 1) {
      parts.push(`=== Sheet: ${sheetName} ===`);
    }

    for (const row of rows) {
      parts.push(row.join("\t"));
    }

    parts.push(""); // blank line between sheets
  }

  return parts.join("\n").trim();
}

/**
 * Extract text from a PDF buffer using pdf-parse v2.
 *
 * pdf-parse v2 uses a class-based API:
 *   new PDFParse({ data }) → .getText() → TextResult.text
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  await parser.destroy();
  return result.text.trim();
}
