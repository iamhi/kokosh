import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { readFileTool } from '../../handlers/llmhandler/tools/readFileTool.js';
import { globTool } from '../../handlers/llmhandler/tools/globTool.js';
import { grepTool } from '../../handlers/llmhandler/tools/grepTool.js';
import { resolve } from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { executeFromFiles } from '../../handlers/llmhandler/index.js';

dotenv.config();

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 -s <system> -u <user> [options]')
  .option('system', {
    alias: 's',
    type: 'string',
    demandOption: true,
    describe: 'Path to system prompt file',
  })
  .option('user', {
    alias: 'u',
    type: 'string',
    demandOption: true,
    describe: 'Path to user prompt file',
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    describe: 'Path to write the result (optional)',
  })
  .option('max-iterations', {
    alias: 'i',
    type: 'number',
    describe: 'Max agent loop iterations (default: 20)',
  })
  .option('tool-calling-model', {
    type: 'string',
    describe: 'Override OLLAMA_MODEL_TOOL_CALLING',
  })
  .option('synthesis-model', {
    type: 'string',
    describe: 'Override OLLAMA_MODEL_SYNTHESIS',
  })
  .option('image', {
    alias: 'img',
    type: 'array',
    describe: 'Path(s) to image file(s) to attach to the user prompt',
  })
  .help()
  .parse();

// Built-in test tool — proves tool calling works without external dependencies
const getCurrentTimeTool = {
  name: 'get_current_time',
  description: 'Returns the current date and time in ISO 8601 format',
  parameters: { type: 'object', properties: {} },
  execute: async () => new Date().toISOString(),
};

const run = async () => {
  const systemPath = resolve(argv.system);
  const userPath = resolve(argv.user);
  const outputPath = argv.output ? resolve(argv.output) : undefined;

  const modelConfig = {};
  if (argv['tool-calling-model']) modelConfig.toolCalling = argv['tool-calling-model'];
  if (argv['synthesis-model']) modelConfig.synthesis = argv['synthesis-model'];

  const images = argv.image?.map((imgPath) =>
    readFileSync(resolve(imgPath)).toString('base64')
  );

  console.log(`system : ${systemPath}`);
  console.log(`user   : ${userPath}`);
  if (outputPath) console.log(`output : ${outputPath}`);
  if (images?.length) console.log(`images : ${argv.image.join(', ')}`);
  console.log('---');

  const result = await executeFromFiles(systemPath, userPath, outputPath, {
    images,
    tools: [getCurrentTimeTool, readFileTool, globTool, grepTool],
    modelConfig: Object.keys(modelConfig).length ? modelConfig : undefined,
    maxIterations: argv['max-iterations'],
  });

  console.log('\n--- result ---\n');
  console.log(result);

  if (outputPath) console.log(`\nsaved to: ${outputPath}`);
};

run().catch((err) => {
  console.error('error:', err.message);
  process.exit(1);
});
