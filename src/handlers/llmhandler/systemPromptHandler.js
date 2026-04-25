import { readFileSync } from 'fs';

export const getSystemPromptFromFile = (fileFullpath) => {
  return readFileSync(fileFullpath, 'utf8');
};
