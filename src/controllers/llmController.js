import { run } from '../handlers/llmhandler/index.js';
import { readFileTool } from '../handlers/llmhandler/tools/readFileTool.js';
import { globTool } from '../handlers/llmhandler/tools/globTool.js';
import { grepTool } from '../handlers/llmhandler/tools/grepTool.js';
import { webFetchTool } from '../handlers/llmhandler/tools/webFetchTool.js';
import { listDirTool } from '../handlers/llmhandler/tools/listDirTool.js';
import { writeFileTool } from '../handlers/llmhandler/tools/writeFileTool.js';
import { webSearchTool } from '../handlers/llmhandler/tools/webSearchTool.js';
import { rssTool } from '../handlers/llmhandler/tools/rssTool.js';
import { pdfTool } from '../handlers/llmhandler/tools/pdfTool.js';
import { scratchpadTool } from '../handlers/llmhandler/tools/scratchpadTool.js';
import { ragTool } from '../handlers/llmhandler/tools/ragTool.js';

const AVAILABLE_TOOLS = {
  [readFileTool.name]: readFileTool,
  [globTool.name]: globTool,
  [grepTool.name]: grepTool,
  [webFetchTool.name]: webFetchTool,
  [listDirTool.name]: listDirTool,
  [writeFileTool.name]: writeFileTool,
  [webSearchTool.name]: webSearchTool,
  [rssTool.name]: rssTool,
  [pdfTool.name]: pdfTool,
  [scratchpadTool.name]: scratchpadTool,
  [ragTool.name]: ragTool,
};

const resolveTools = (toolNames) => {
  if (!Array.isArray(toolNames)) return [];
  return toolNames.flatMap((name) => AVAILABLE_TOOLS[name] ?? []);
};

export const llm = async (req, res) => {
  const { system, user, images, tools: toolNames, modelConfig, maxIterations } = req.body;

  try {
    const result = await run({
      system,
      userPrompt: user,
      images,
      tools: resolveTools(toolNames),
      modelConfig,
      maxIterations,
    });

    return res.json({ success: true, result });
  } catch (err) {
    return res.status(200).json({
      success: false,
      result: { answer: null, toolCalls: err.toolCalls ?? [], error: err.message },
    });
  }
};
