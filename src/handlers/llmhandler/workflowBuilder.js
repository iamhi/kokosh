import { createRegistry } from './tools/registry.js';
import { createSummerizer } from './agents/summerizer.js';
import { createSynthesis } from './agents/synthesis.js';
import { createToolCaller } from './agents/toolCaller.js';

export const basicWorkflow = ({ provider, modelConfig, userTools = [] }) => {
  // 1. generate the tools
  const registry = createRegistry();
  for (const tool of userTools) {
    registry.register(tool);
  }

  // 2. generate the agents
  const toolCaller = createToolCaller(provider, modelConfig.toolCalling);
  const synthesis = createSynthesis(provider, modelConfig.synthesis);
  const summerizer = createSummerizer(provider, modelConfig.summarization);

  // 3. generate the loop
  return { registry, toolCaller, synthesis, summerizer };
};
