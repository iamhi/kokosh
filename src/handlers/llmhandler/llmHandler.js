import { getProvider } from './providers/index.js';
import { agentLoop } from './basicLoop.js';
import { basicWorkflow } from './workflowBuilder.js';

export const run = async ({
  system,
  userPrompt,
  images,
  tools: userTools = [],
  modelConfig = {},
  maxIterations,
}) => {
  const { provider, defaultModelConfig } = getProvider();

  if (provider.prepare) {
    provider.prepare();
  }

  const mergedConfig = { ...defaultModelConfig, ...modelConfig };

  const { registry, toolCaller, synthesis, summerizer } = basicWorkflow({
    provider,
    modelConfig: mergedConfig,
    userTools,
  });

  return agentLoop({
    system,
    userPrompt,
    images,
    registry,
    toolCaller,
    synthesis,
    summerizer,
    maxIterations,
  });
};
