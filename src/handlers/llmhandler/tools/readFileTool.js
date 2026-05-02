import { readFileSync } from 'node:fs';

export const readFileTool = {
  name: 'read_file',
  description: 'Reads the full content of a file and returns it as a string. Call this whenever the user mentions a file path.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute or relative path to the file to read.',
      },
    },
    required: ['path'],
  },
  execute: async ({ path }) => {
    try {
      return readFileSync(path, 'utf8');
    } catch (err) {
      return `Error reading file "${path}": ${err.message}`;
    }
  },
};
