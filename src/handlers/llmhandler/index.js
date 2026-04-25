import { callLlm } from './llmHandler';
import { persistResultInFile } from './outputResultHandler';
import { getSystemPromptFromFile } from './systemPromptHandler';
import { getUserPromptFromFile } from './userPromptHandler';

export const executeFromFiles = (
  systemPromptFullPath,
  userPromptFullPath,
  outputResultFullpath
) => {
  const systemPromptMessage = getSystemPromptFromFile(systemPromptFullPath);
  const userPromptMessage = getUserPromptFromFile(userPromptFullPath);

  const result = callLlm({
    system: systemPromptMessage,
    user: userPromptMessage,
  });

  if (outputResultFullpath) {
    persistResultInFile(outputResultFullpath, result);
  }

  return result;
};
