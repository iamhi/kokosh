import { run } from './llmHandler.js';
import { persistResultInFile } from './outputResultHandler.js';
import { getSystemPromptFromFile } from './systemPromptHandler.js';
import { getUserPromptFromFile } from './userPromptHandler.js';

export { run };

export const executeFromFiles = async (
  systemPromptFullPath,
  userPromptFullPath,
  outputResultFullpath,
  options = {}
) => {
  const system = getSystemPromptFromFile(systemPromptFullPath);
  const userPrompt = getUserPromptFromFile(userPromptFullPath);

  const result = await run({
    system,
    userPrompt,
    tools: options.tools,
    modelConfig: options.modelConfig,
    maxIterations: options.maxIterations,
  });

  if (outputResultFullpath) {
    persistResultInFile(outputResultFullpath, result);
  }

  return result;
};
