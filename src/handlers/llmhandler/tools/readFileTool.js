import { readFileSync } from 'node:fs';
import { checkDirectoryAccess } from '../permissions/directoryGuard.js';

const DEFAULT_LIMIT = 2000;

export const readFileTool = {
  name: 'read_file',
  description: `Reads a file and returns its content with line numbers (cat -n format). Large files are paginated — by default returns the first ${DEFAULT_LIMIT} lines. Use offset and limit to read a specific range.

Parameters:
- path (required): Absolute or relative path to the file.
- offset (optional): Line number to start from (1-indexed). Defaults to 1.
- limit (optional): Maximum number of lines to return. Defaults to ${DEFAULT_LIMIT}.

When a file is truncated, the response includes a note showing the total line count and the offset to use to continue reading.`,
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

    let content;
    try {
      content = readFileSync(path, 'utf8');
    } catch (err) {
      return `Error reading file "${path}": ${err.message}`;
    }

    const lines = content.split('\n');
    const totalLines = lines.length;
    const startLine = Math.max(1, Math.floor(offset));
    const slice = lines.slice(startLine - 1, startLine - 1 + limit);
    const endLine = startLine + slice.length - 1;

    const padWidth = String(totalLines).length;
    const numbered = slice.map((line, i) => {
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
