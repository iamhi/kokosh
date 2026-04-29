import { readFileSync } from 'fs';

export const getUserPromptFromFile = (fileFullpath) => {
  return readFileSync(fileFullpath, 'utf8');
};
