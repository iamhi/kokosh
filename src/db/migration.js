import fs from 'fs';
import path from 'path';

import db from './db.js';
import { pathToFileURL } from 'url';

const generateChangelogMap = async (changelogPath) => {
  const files = fs.readdirSync(changelogPath);
  const changelogs = {};

  for (const file of files) {
    if (file.endsWith('.js')) {
      const changelogName = file.replace('.js', '');
      const filePath = path.join(changelogPath, file);
      const fileUrl = pathToFileURL(filePath).href;

      changelogs[changelogName] = await import(fileUrl);
    }
  }

  return changelogs;
};

export const migrate = async (
  changelogPath = './src/db/changelog',
  databasePath = './database.db'
) => {
  const absoluteChangelogPath = path.resolve(process.cwd(), changelogPath);
  const absoluteDatabasePath = path.resolve(process.cwd(), databasePath);

  const changelogMap = await generateChangelogMap(absoluteChangelogPath);

  const database = db.get(absoluteDatabasePath);
  const changelogKeys = Object.keys(changelogMap).sort();

  changelogKeys.forEach((key) => changelogMap[key].default.execute(database));

  database.close();
};
