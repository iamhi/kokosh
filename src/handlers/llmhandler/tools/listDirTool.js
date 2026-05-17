import { readdir } from 'node:fs/promises';
import { checkDirectoryAccess } from '../permissions/directoryGuard.js';

export const listDirTool = {
  name: 'list_directory',
  description: `List the contents of a directory.
Useful for navigating the project structure and discovering files.
Returns a list of files and subdirectories.`,
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Directory path to list. Defaults to current working directory.',
      },
    },
  },
  execute: async ({ path: targetPath }) => {
    const root = targetPath ?? process.cwd();
    const denied = checkDirectoryAccess(root);
    if (denied) return denied;

    try {
      const entries = await readdir(root, { withFileTypes: true });
      if (entries.length === 0) return `Directory "${root}" is empty.`;

      const lines = entries.map((entry) => {
        const type = entry.isDirectory() ? '[DIR]' : '[FILE]';
        return `${type}\t${entry.name}`;
      });

      return lines.sort().join('\n');
    } catch (err) {
      return `Error listing directory "${root}": ${err.message}`;
    }
  },
};
