import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { run } from '../handlers/llmhandler/llmHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '../../public/reports');

/**
 * FinalSynthesizer: Reads all persisted findings and creates the final report.
 */
export async function runFinalSynthesizer(goal, findings) {
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  const systemPrompt = `
You are the Final Synthesis Agent.
Your goal is to read the research findings gathered for the goal: "${goal}".
Synthesize them into a single, high-quality Markdown report.
The report must be comprehensive, well-structured, and include the best and most relevant data discovered.
Exclude any meta-conversation or tool execution logs.
  `;

  const MAX_FINDING_LENGTH = 10000;

  const findingsContent = findings.map(f => {
    let raw = fs.readFileSync(f.filePath, 'utf8');
    if (raw.length > MAX_FINDING_LENGTH) {
      raw = raw.substring(0, MAX_FINDING_LENGTH) + '\n\n... [Finding truncated for brevity] ...';
    }
    return `### Finding from ${f.toolName}\n${raw}\n---\n`;
  }).join('\n');

  const userPrompt = `
Research Goal: ${goal}

Gathered Findings:
${findingsContent}

Please provide the final consolidated report in Markdown.
  `;

  const result = await run({
    system: systemPrompt,
    userPrompt: userPrompt,
    maxIterations: 1 // Just synthesize and return
  });

  const timestamp = Date.now();
  const dateStr = new Date(timestamp).toISOString().split('T')[0];
  const fileName = `final_report_${timestamp}_${dateStr}.md`;
  const filePath = path.join(PUBLIC_DIR, fileName);

  fs.writeFileSync(filePath, result.answer);

  return {
    answer: result.answer,
    filePath: filePath
  };
}
