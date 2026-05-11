import { migrate } from '../../db/migration.js';
import { setupAllRepositories } from '../../db/repositories.js';

const setup = async () => {
  await migrate();

  setupAllRepositories();
};

setup();
