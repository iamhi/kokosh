import * as ollamaProvider from './providers/ollamaHandler.js';
import { agentLoop } from './basicLoop.js';
import { basicWorkflow } from './workflowBuilder.js';

export const run = async ({
  system,
  userPrompt,
  tools: userTools = [],
  modelConfig = {},
  maxIterations,
}) => {
  ollamaProvider.prepare();

  const defaultModelConfig = {
    toolCalling: process.env.OLLAMA_MODEL_TOOL_CALLING || 'llama3.2:1b',
    synthesis: process.env.OLLAMA_MODEL_SYNTHESIS || 'llama3.2:1b',
    summarization: process.env.OLLAMA_MODEL_SUMMARIZATION || 'llama3.2:1b',
  };

  const mergedConfig = { ...defaultModelConfig, ...modelConfig };

  const { registry, toolCaller, synthesis, summerizer } = basicWorkflow({
    provider: ollamaProvider,
    modelConfig: mergedConfig,
    userTools,
  });

  return agentLoop({
    system,
    userPrompt,
    registry,
    toolCaller,
    synthesis,
    summerizer,
    maxIterations,
  });
};
