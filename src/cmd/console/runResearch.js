import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeTask } from '../../service/researchPipeline.js';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '../../../research-config.json');

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 [options]')
  .option('task', {
    alias: 't',
    type: 'string',
    describe: 'ID of a specific task to run from research-config.json. If omitted, runs all tasks.',
  })
  .option('all', {
    alias: 'a',
    type: 'boolean',
    default: false,
    describe: 'Run all tasks in the configuration.',
  })
  .help()
  .argv;

async function run() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`❌ Configuration file not found at ${CONFIG_PATH}`);
    process.exit(1);
  }

  let config;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    config = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Failed to parse research-config.json: ${err.message}`);
    process.exit(1);
  }

  const tasks = config.tasks || [];
  
  if (argv.task) {
    const task = tasks.find(t => t.id === argv.task);
    if (!task) {
      console.error(`❌ Task with ID "${argv.task}" not found in configuration.`);
      process.exit(1);
    }
    await executeTask(task);
  } else if (argv.all) {
    console.log('🚀 Running all configured research tasks...');
    for (const task of tasks) {
      await executeTask(task);
    }
  } else {
    console.log('💡 Please specify a task with --task <id> or run all with --all');
    console.log('Available tasks:');
    tasks.forEach(t => console.log(` - ${t.id}`));
  }
}

run().catch(err => {
  console.error('❌ CLI execution failed:', err);
  process.exit(1);
});
