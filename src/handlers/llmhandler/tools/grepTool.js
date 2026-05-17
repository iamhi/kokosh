import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { stat } from 'node:fs/promises';
import { relative } from 'node:path';
import { walkDir, globToRegex } from './_walkDir.js';
import { checkDirectoryAccess } from '../permissions/directoryGuard.js';

const MAX_FILE_BYTES = 1 * 1024 * 1024; // 1 MB
const BINARY_CHECK_BYTES = 8 * 1024;    // 8 KB
const DEFAULT_LIMIT = 100;

async function isBinary(file) {
  return new Promise((resolve) => {
    const stream = createReadStream(file, { end: BINARY_CHECK_BYTES });
    stream.on('data', (chunk) => {
      if (chunk.includes(0)) {
        resolve(true);
        stream.destroy();
      }
    });
    stream.on('end', () => resolve(false));
    stream.on('error', () => resolve(false));
  });
}

export const grepTool = {
  name: 'grep_files',
  description: `Search inside files for a specific text pattern or regular expression.
Excellent for finding keywords in large datasets, logs, or documents without reading the entire file.
Set 'output_mode' to 'content' to see the actual text lines containing your keyword.
Set 'include' to filter by file type (e.g., '*.csv' or '*.txt').`,
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Regular expression to search for in file contents.',
      },
      path: {
        type: 'string',
        description: 'Root directory to search. Defaults to current working directory.',
      },
      include: {
        type: 'string',
        description: 'Glob pattern to filter which files are searched, e.g. "*.ts".',
      },
      output_mode: {
        type: 'string',
        enum: ['files_with_matches', 'content'],
        description:
          '"files_with_matches" lists files with matches. "content" shows matching lines.',
      },
      limit: {
        type: 'number',
        description: `Maximum results to return. Defaults to ${DEFAULT_LIMIT}.`,
      },
    },
    required: ['pattern'],
  },
  execute: async ({
    pattern,
    path: searchRoot,
    include,
    output_mode = 'files_with_matches',
    limit = DEFAULT_LIMIT,
  }) => {
    const root = searchRoot ?? process.cwd();

    const denied = checkDirectoryAccess(root);
    if (denied) return denied;

    let regex;
    try {
      regex = new RegExp(pattern);
    } catch {
      return `Error: invalid regular expression "${pattern}"`;
    }

    const includeRegex = include ? globToRegex(include) : null;
    const results = [];
    let truncated = false;

    for await (const file of walkDir(root)) {
      if (results.length >= limit) {
        truncated = true;
        break;
      }

      const rel = relative(root, file).replace(/\\/g, '/');

      if (includeRegex && !includeRegex.test(rel)) continue;

      try {
        const stats = await stat(file);
        if (stats.size > MAX_FILE_BYTES) continue;
      } catch {
        continue;
      }

      if (await isBinary(file)) continue;

      try {
        const rl = createInterface({
          input: createReadStream(file),
          terminal: false,
        });

        let currentLine = 0;
        for await (const line of rl) {
          currentLine++;
          if (regex.test(line)) {
            if (output_mode === 'files_with_matches') {
              results.push(rel);
              break; // exit for-await (readline)
            } else {
              results.push(`${rel}:${currentLine}: ${line}`);
              if (results.length >= limit) {
                truncated = true;
                break;
              }
            }
          }
        }
        if (truncated) break; // exit for-await (walkDir)
      } catch {
        continue;
      }
    }

    if (results.length === 0) return `No matches found for "${pattern}"`;

    const noun = output_mode === 'files_with_matches' ? 'file' : 'match';
    const lines = [...results];
    if (truncated) {
      lines.push(
        `[Results capped at ${limit}. Use a more specific pattern, path, or include filter.]`,
      );
    } else {
      lines.push(`[${results.length} ${noun}${results.length === 1 ? '' : 's'} found]`);
    }

    return lines.join('\n');
  },
};
