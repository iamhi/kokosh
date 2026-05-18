import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { run } from '../handlers/llmhandler/llmHandler.js';

// Tools
import { readFileTool } from '../handlers/llmhandler/tools/readFileTool.js';
import { webSearchTool } from '../handlers/llmhandler/tools/webSearchTool.js';
import { rssTool } from '../handlers/llmhandler/tools/rssTool.js';
import { webFetchTool } from '../handlers/llmhandler/tools/webFetchTool.js';
import { scratchpadTool } from '../handlers/llmhandler/tools/scratchpadTool.js';
import { ragTool } from '../handlers/llmhandler/tools/ragTool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH_DIR = path.join(__dirname, '../../scratch/reports');
const PUBLIC_DIR = path.join(__dirname, '../../public/reports');

// Standard discovery tools
const DEFAULT_TOOLS = [webSearchTool, rssTool, webFetchTool, scratchpadTool, ragTool];

const DISCOVERY_GUIDELINES = `
IMPORTANT GUIDELINES FOR UNBIASED, AUTONOMOUS RESEARCH:
1. INDEPENDENT DISCOVERY FIRST: Your primary goal is to find FRESH and INDEPENDENT sources. Use web_search (engine="all") to proactively look for new websites, niche blogs, and RSS feeds that are NOT in any existing list. 
2. UNGUIDED THINKING: Do not rely solely on provided databases. Actively search for "alternative viewpoints", "contrarian analysis", and "raw data sources" related to the topic.
3. RAG AS SECONDARY: Use the research_rag tool ONLY to supplement your findings with established trusted sources (trusted_rss.json). Do not let the database limit your exploration.
4. RSS EXTRACTION: When you find a relevant website via web search, try to find its RSS feed URL or direct news endpoint to get the most detailed information.
5. IGNORE ACCESS ERRORS: If you hit CAPTCHAs or 403s, move on immediately to find a different, accessible source.
`;

/**
 * Executes a single research task.
 * @param {Object} task - The task configuration from JSON.
 */
export async function executeTask(task) {
  console.log(`🚀 Executing task: ${task.id}`);

  // Ensure directories exist
  if (!fs.existsSync(SCRATCH_DIR)) fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  try {
    let userPrompt = task.user;
    let tools = DEFAULT_TOOLS;
    let systemPrompt = task.system;

    if (task.isSynthesis) {
      // For synthesis, we need to find the files generated today
      const today = new Date().toISOString().split('T')[0];
      const files = fs.readdirSync(SCRATCH_DIR)
        .filter(f => f.includes(today))
        .map(f => path.join(SCRATCH_DIR, f));

      if (files.length === 0) {
        console.warn(`⚠️ No discovery data found for today (${today}). Synthesis might be incomplete.`);
      }

      userPrompt = `${task.user}\n\nFiles to analyze:\n${files.map(f => `- ${f}`).join('\n')}`;
      tools = [readFileTool];
    } else {
      // Add guidelines to discovery tasks
      systemPrompt = `${task.system}\n\n${DISCOVERY_GUIDELINES}`;
    }

    const result = await run({
      system: systemPrompt,
      userPrompt: userPrompt,
      tools: tools,
      maxIterations: task.maxIterations || 10
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `${task.id}_${dateStr}.md`;
    
    // Save to public if it's a synthesis, otherwise scratch
    const targetDir = task.isSynthesis ? PUBLIC_DIR : SCRATCH_DIR;
    const filePath = path.join(targetDir, fileName);
    
    fs.writeFileSync(filePath, result.answer || '');
    console.log(`✅ Task ${task.id} completed. Saved to ${filePath}`);
  } catch (error) {
    console.error(`❌ Error in task ${task.id}:`, error);
  }
}
