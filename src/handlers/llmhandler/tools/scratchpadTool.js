import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const SCRATCHPAD_PATH = resolve(process.cwd(), 'scratch/research_notes.md');

/**
 * Scratchpad Tool for persistent research notes.
 */
export const scratchpadTool = {
  name: 'research_scratchpad',
  description: `Manage a persistent research notebook.
Use this to save important facts, hypotheses, and conclusions that should persist across long research sessions.
You can 'read' the notebook, 'write' (overwrite) it, or 'append' new notes to it.`,
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['read', 'write', 'append'],
        description: 'The action to perform on the scratchpad.',
      },
      content: {
        type: 'string',
        description: 'The content to write or append. Required for "write" and "append" actions.',
      },
    },
    required: ['action'],
  },
  execute: async ({ action, content }) => {
    try {
      await mkdir(dirname(SCRATCHPAD_PATH), { recursive: true });

      if (action === 'read') {
        try {
          const data = await readFile(SCRATCHPAD_PATH, 'utf8');
          return data || 'The research scratchpad is currently empty.';
        } catch (err) {
          if (err.code === 'ENOENT') {
            return 'The research scratchpad has not been created yet.';
          }
          throw err;
        }
      }

      if (action === 'write') {
        if (typeof content !== 'string') return 'Error: "content" is required for "write" action.';
        await writeFile(SCRATCHPAD_PATH, content, 'utf8');
        return 'Successfully overwrote the research scratchpad.';
      }

      if (action === 'append') {
        if (typeof content !== 'string') return 'Error: "content" is required for "append" action.';
        let existing = '';
        try {
          existing = await readFile(SCRATCHPAD_PATH, 'utf8');
          if (existing && !existing.endsWith('\n')) existing += '\n';
        } catch (err) {
          if (err.code !== 'ENOENT') throw err;
        }
        
        const timestamp = new Date().toISOString();
        const newEntry = `\n--- [${timestamp}] ---\n${content}\n`;
        await writeFile(SCRATCHPAD_PATH, existing + newEntry, 'utf8');
        return 'Successfully appended to the research scratchpad.';
      }

      return `Error: Unknown action "${action}".`;
    } catch (err) {
      return `Error managing scratchpad: ${err.message}`;
    }
  },
};
