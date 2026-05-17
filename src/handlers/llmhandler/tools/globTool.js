import { relative } from 'node:path';
import { walkDir, globToRegex } from './_walkDir.js';
import { checkDirectoryAccess } from '../permissions/directoryGuard.js';

const DEFAULT_LIMIT = 100;

export const globTool = {
  name: 'glob_files',
  description: `Find files in the local filesystem by their name.
Use this to discover datasets, documents, or logs before analyzing them.
Examples: "**/*.csv" (finds all CSV files), "**/*report*.txt" (finds text files with "report" in the name).
Returns a list of matching file paths.`,
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Glob pattern, e.g. "**/*.js" or "src/**/*.ts".',
      },
      path: {
        type: 'string',
        description: 'Root directory to search. Defaults to current working directory.',
      },
      limit: {
        type: 'number',
        description: `Maximum results to return. Defaults to ${DEFAULT_LIMIT}.`,
      },
    },
    required: ['pattern'],
  },
  execute: async ({ pattern, path: searchRoot, limit = DEFAULT_LIMIT }) => {
    const root = searchRoot ?? process.cwd();

    const denied = checkDirectoryAccess(root);
    if (denied) return denied;

    let regex;
    try {
      regex = globToRegex(pattern);
    } catch (err) {
      return `Error: invalid glob pattern "${pattern}": ${err.message}`;
    }

    const results = [];
    let truncated = false;

    for await (const file of walkDir(root)) {
      const rel = relative(root, file).replace(/\\/g, '/');
      if (regex.test(rel)) {
        if (results.length >= limit) {
          truncated = true;
          break;
        }
        results.push(rel);
      }
    }

    if (results.length === 0) return `No files matched pattern "${pattern}"`;

    const lines = [...results];
    if (truncated) {
      lines.push(
        `[Results capped at ${limit}. Use a more specific pattern or increase limit.]`,
      );
    } else {
      lines.push(`[${results.length} file${results.length === 1 ? '' : 's'} matched]`);
    }

    return lines.join('\n');
  },
};
