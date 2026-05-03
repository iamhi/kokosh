import { readFileSync, statSync } from 'node:fs';
import { relative } from 'node:path';
import { walkDir, globToRegex } from './_walkDir.js';

const MAX_FILE_BYTES = 1 * 1024 * 1024; // 1 MB
const BINARY_CHECK_BYTES = 8 * 1024;    // 8 KB
const DEFAULT_LIMIT = 100;

function isBinary(buf) {
  const slice = buf.subarray(0, BINARY_CHECK_BYTES);
  return slice.includes(0);
}

export const grepTool = {
  name: 'grep_files',
  description: `Search file contents using a regular expression. Skips binary files, files over 1 MB, node_modules, and hidden directories.

output_mode:
- "files_with_matches" (default): returns paths of files containing at least one match
- "content": returns matching lines as "file:lineNumber: line"

Parameters:
- pattern (required): Regular expression to search for, e.g. "function\\s+\\w+" or "TODO".
- path (optional): Root directory to search. Defaults to current working directory.
- include (optional): Glob pattern to filter which files are searched, e.g. "*.ts" or "**/*.js".
- output_mode (optional): "files_with_matches" or "content". Defaults to "files_with_matches".
- limit (optional): Maximum results to return. Defaults to ${DEFAULT_LIMIT}.`,
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

    let regex;
    try {
      regex = new RegExp(pattern);
    } catch {
      return `Error: invalid regular expression "${pattern}"`;
    }

    const includeRegex = include ? globToRegex(include) : null;
    const allFiles = walkDir(root);
    const results = [];
    let truncated = false;

    for (const file of allFiles) {
      if (results.length >= limit) {
        truncated = true;
        break;
      }

      const rel = relative(root, file).replace(/\\/g, '/');

      if (includeRegex && !includeRegex.test(rel)) continue;

      let size;
      try {
        size = statSync(file).size;
      } catch {
        continue;
      }
      if (size > MAX_FILE_BYTES) continue;

      let buf;
      try {
        buf = readFileSync(file);
      } catch {
        continue;
      }
      if (isBinary(buf)) continue;

      const content = buf.toString('utf8');

      if (output_mode === 'files_with_matches') {
        if (regex.test(content)) results.push(rel);
      } else {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (results.length >= limit) {
            truncated = true;
            break;
          }
          if (regex.test(lines[i])) {
            results.push(`${rel}:${i + 1}: ${lines[i]}`);
          }
        }
        if (truncated) break;
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
