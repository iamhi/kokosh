import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { checkDirectoryAccess } from '../permissions/directoryGuard.js';

const DEFAULT_LIMIT = 2000;

export const readFileTool = {
  name: 'read_file',
  description: `Read the contents of a local file (text, CSV, JSON, logs, markdown). Returns the text with line numbers. Use this to read data or documents for analysis.
WARNING: Do not use this to search for specific keywords across files; use 'grep_files' instead.
Large files are paginated automatically. If a file is truncated, use the 'offset' parameter to read the next chunk.`,
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute or relative path to the file to read.',
      },
      offset: {
        type: 'number',
        description: 'Line number to start reading from (1-indexed). Defaults to 1.',
      },
      limit: {
        type: 'number',
        description: `Maximum number of lines to return. Defaults to ${DEFAULT_LIMIT}.`,
      },
    },
    required: ['path'],
  },
  execute: async ({ path, offset = 1, limit = DEFAULT_LIMIT }) => {
    const denied = checkDirectoryAccess(path);
    if (denied) return denied;

    const startLine = Math.max(1, Math.floor(offset));
    const maxLine = startLine + limit - 1;
    const lines = [];
    let currentLine = 0;
    let totalLines = 0;

    try {
      const rl = createInterface({
        input: createReadStream(path),
        terminal: false,
      });

      for await (const line of rl) {
        currentLine++;
        totalLines = currentLine;
        if (currentLine >= startLine && currentLine <= maxLine) {
          lines.push(line);
        }
      }
    } catch (err) {
      return `Error reading file "${path}": ${err.message}`;
    }

    if (totalLines === 0 && startLine > 1) {
      return `Error: file "${path}" has fewer than ${startLine} lines.`;
    }

    const endLine = Math.min(totalLines, maxLine);
    const padWidth = String(totalLines).length;
    const numbered = lines.map((line, i) => {
      const lineNum = String(startLine + i).padStart(padWidth);
      return `${lineNum}\t${line}`;
    });

    if (endLine < totalLines) {
      numbered.push(
        `[Truncated: showing lines ${startLine}–${endLine} of ${totalLines} total. Use offset=${endLine + 1} to continue reading.]`,
      );
    }

    return numbered.join('\n');
  },
};
