import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { checkDirectoryAccess } from '../permissions/directoryGuard.js';

export const writeFileTool = {
  name: 'write_file',
  description: `Write or overwrite a file with specific content.
Use this to save synthesized notes, research summaries, or intermediate artifacts.
Creates parent directories automatically if they don't exist.`,
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to write.',
      },
      content: {
        type: 'string',
        description: 'Text content to write to the file.',
      },
    },
    required: ['path', 'content'],
  },
  execute: async ({ path, content }) => {
    const denied = checkDirectoryAccess(path);
    if (denied) return denied;

    try {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content, 'utf8');
      return `Successfully wrote to file: ${path}`;
    } catch (err) {
      return `Error writing to file "${path}": ${err.message}`;
    }
  },
};
