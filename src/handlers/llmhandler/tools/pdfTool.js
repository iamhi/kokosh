import { PDFParse } from 'pdf-parse';
import { readFile } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';

/**
 * PDF Tool for research.
 * Extracts text from PDF files.
 */
export const pdfTool = {
  name: 'parse_pdf',
  description: `Extract text content from a PDF file.
Use this to read whitepapers, reports, and manuals in PDF format.
Returns the extracted text.`,
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The local path to the PDF file.',
      },
    },
    required: ['path'],
  },
  execute: async ({ path }) => {
    if (typeof path !== 'string' || path.trim() === '') {
      return 'Error: "path" parameter is required and must be a non-empty string.';
    }

    const absolutePath = isAbsolute(path) ? path : resolve(process.cwd(), path);

    try {
      const dataBuffer = await readFile(absolutePath);
      const parser = new PDFParse({ data: dataBuffer });
      const result = await parser.getText();
      const info = await parser.getInfo();

      if (!result.text || result.text.trim() === '') {
        return `The PDF at "${path}" appears to have no extractable text.`;
      }

      // Metadata info
      const meta = [
        `Title: ${info.info?.Title || 'N/A'}`,
        `Author: ${info.info?.Author || 'N/A'}`,
        `Pages: ${result.total}`,
      ].join(', ');

      return `PDF Info: ${meta}\n\nContent:\n${result.text}`;
    } catch (err) {
      return `Error parsing PDF at "${path}": ${err.message}`;
    }
  },
};
