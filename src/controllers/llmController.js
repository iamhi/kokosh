import { run } from '../handlers/llmhandler/index.js';
import { readFileTool } from '../handlers/llmhandler/tools/readFileTool.js';
import { globTool } from '../handlers/llmhandler/tools/globTool.js';
import { grepTool } from '../handlers/llmhandler/tools/grepTool.js';

const ALL_TOOLS = [readFileTool, globTool, grepTool];

export const llm = async (req, res, next) => {
  const { system, user, images, modelConfig, maxIterations } = req.body;

  try {
    const result = await run({
      system,
      userPrompt: user,
      images,
      tools: ALL_TOOLS,
      modelConfig,
      maxIterations,
    });

    return res.json({ success: true, result });
  } catch (err) {
    return next(err);
  }
};
