import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeTask } from './researchPipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '../../research-config.json');

export function startScheduler() {
  console.log('📅 Scheduler initialized.');

  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`❌ Configuration file not found at ${CONFIG_PATH}`);
    return;
  }

  let config;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    config = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Failed to parse research-config.json: ${err.message}`);
    return;
  }

  if (!config.tasks || !Array.isArray(config.tasks)) {
    console.error('❌ Invalid configuration: "tasks" array is missing.');
    return;
  }

  // Schedule each task from the JSON
  config.tasks.forEach(task => {
    if (!task.cron || !task.id) {
      console.warn(`⚠️ Skipping task without cron or id: ${JSON.stringify(task)}`);
      return;
    }

    console.log(`⏰ Scheduling task "${task.id}" with cron: ${task.cron}`);
    cron.schedule(task.cron, () => {
      console.log(`⏰ Triggered scheduled task: ${task.id}`);
      executeTask(task).catch(err => {
        console.error(`❌ Task ${task.id} failed:`, err);
      });
    });
  });

  // Optional: Run all tasks once on startup for debugging
  if (process.env.RUN_PIPELINE_ON_STARTUP === 'true') {
    console.log('🚀 Running initial research tasks on startup...');
    config.tasks.forEach(task => {
      executeTask(task).catch(err => {
        console.error(`❌ Initial run for ${task.id} failed:`, err);
      });
    });
  }
}
