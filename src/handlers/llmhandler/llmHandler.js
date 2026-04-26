import * as ollamaProvider from './providers/ollamaHandler.js';
import { createRegistry } from './tools/registry.js';
import { agentLoop } from './loop.js';

const DEFAULT_MODEL_CONFIG = {
  toolCalling: process.env.OLLAMA_MODEL_TOOL_CALLING || 'llama3.2:1b',
  synthesis: process.env.OLLAMA_MODEL_SYNTHESIS || 'llama3.2:1b',
  summarization: process.env.OLLAMA_MODEL_SUMMARIZATION || 'llama3.2:1b',
};

export const run = async ({
  system,
  userPrompt,
  tools: userTools = [],
  modelConfig = {},
  maxIterations,
}) => {
  ollamaProvider.prepare();

  const registry = createRegistry();

  for (const tool of userTools) {
    registry.register(tool);
  }

  return agentLoop({
    system,
    userPrompt,
    registry,
    provider: ollamaProvider,
    modelConfig: { ...DEFAULT_MODEL_CONFIG, ...modelConfig },
    maxIterations,
  });
};
