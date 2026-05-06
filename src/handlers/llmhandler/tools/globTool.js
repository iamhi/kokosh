import { relative } from 'node:path';
import { walkDir, globToRegex } from './_walkDir.js';
import { checkDirectoryAccess } from '../permissions/directoryGuard.js';

const DEFAULT_LIMIT = 100;

export const globTool = {
  name: 'glob_files',
  description: `Find files by name pattern using glob syntax. Returns relative paths sorted by directory walk order. Skips node_modules and hidden directories.

Glob syntax:
- ** matches any number of path segments (including zero)
- *  matches any characters within a single segment
- ?  matches any single character within a segment

Examples: "**/*.js", "src/**/*.ts", "*.json"

Parameters:
- pattern (required): Glob pattern to match files against.
- path (optional): Root directory to search. Defaults to current working directory.
- limit (optional): Maximum number of results to return. Defaults to ${DEFAULT_LIMIT}.`,
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

    const allFiles = walkDir(root);
    const matching = allFiles
      .map((f) => relative(root, f).replace(/\\/g, '/'))
      .filter((rel) => regex.test(rel));

    const truncated = matching.length > limit;
    const results = truncated ? matching.slice(0, limit) : matching;

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
