import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { run } from '../handlers/llmhandler/llmHandler.js';
import { getToolByName } from '../handlers/llmhandler/tools/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH_DIR = path.join(__dirname, '../../scratch/reports');

/**
 * ToolAgent: Executes a single tool and reports back.
 */
export async function runToolAgent({ toolName, toolArguments, context, goal }) {
  if (!fs.existsSync(SCRATCH_DIR)) fs.mkdirSync(SCRATCH_DIR, { recursive: true });

  const tool = getToolByName(toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  const systemPrompt = `
You are a specialized Tool Agent. 
Your ONLY goal is to execute the tool "${toolName}" with the provided arguments to help achieve: "${goal}".
After execution, summarize the result concisely for your Orchestrator.
  `;

  const userPrompt = `
Context: ${context}
Action: Execute ${toolName} with ${JSON.stringify(toolArguments)}
  `;

  // We use the standard run but with maxIterations=2 to ensure it calls the tool and then summarizes
  const result = await run({
    system: systemPrompt,
    userPrompt: userPrompt,
    tools: [tool], // Pass the actual tool object
    maxIterations: 2
  });

  // Persist the raw finding
  const timestamp = Date.now();
  const fileName = `finding_${toolName}_${timestamp}.md`;
  const filePath = path.join(SCRATCH_DIR, fileName);
  
  const persistedContent = `---
tool: ${toolName}
goal: ${goal}
timestamp: ${new Date(timestamp).toISOString()}
---

${result.answer}
  `;

  fs.writeFileSync(filePath, persistedContent);

  return {
    summary: result.answer,
    filePath: filePath,
    toolName: toolName
  };
}
