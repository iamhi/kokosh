import { writeFileSync } from 'fs';

export const persistResultInFile = (outputFullpath, result) => {
  writeFileSync(outputFullpath, result, 'utf8');
};
