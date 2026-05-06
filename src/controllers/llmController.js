import { run } from '../handlers/llmhandler/index.js';
import { readFileTool } from '../handlers/llmhandler/tools/readFileTool.js';
import { globTool } from '../handlers/llmhandler/tools/globTool.js';
import { grepTool } from '../handlers/llmhandler/tools/grepTool.js';

const TOOL_MAP = {
  read_file: readFileTool,
  glob_files: globTool,
  grep_files: grepTool,
};

const VALID_TOOL_NAMES = Object.keys(TOOL_MAP).join(', ');

export const llm = async (req, res, next) => {
  const body = req.body ?? {};

  if (!body.system || typeof body.system !== 'string') {
    return res.status(400).json({ success: false, error: 'system is required and must be a non-empty string' });
  }

  if (!body.user || typeof body.user !== 'string') {
    return res.status(400).json({ success: false, error: 'user is required and must be a non-empty string' });
  }

  if (body.tools !== undefined && !Array.isArray(body.tools)) {
    return res.status(400).json({ success: false, error: 'tools must be an array' });
  }

  if (body.images !== undefined && !Array.isArray(body.images)) {
    return res.status(400).json({ success: false, error: 'images must be an array' });
  }

  if (body.maxIterations !== undefined && !(Number.isInteger(body.maxIterations) && body.maxIterations > 0)) {
    return res.status(400).json({ success: false, error: 'maxIterations must be a positive integer' });
  }

  if (body.modelConfig !== undefined && (typeof body.modelConfig !== 'object' || Array.isArray(body.modelConfig) || body.modelConfig === null)) {
    return res.status(400).json({ success: false, error: 'modelConfig must be an object' });
  }

  const unknownTool = (body.tools ?? []).find((name) => !TOOL_MAP[name]);
  if (unknownTool) {
    return res.status(400).json({ success: false, error: `Unknown tool: ${unknownTool}. Valid tools: ${VALID_TOOL_NAMES}` });
  }

  const resolvedTools = (body.tools ?? []).map((name) => TOOL_MAP[name]);

  try {
    const result = await run({
      system: body.system,
      userPrompt: body.user,
      images: body.images,
      tools: resolvedTools,
      modelConfig: body.modelConfig,
      maxIterations: body.maxIterations,
    });

    return res.json({ success: true, result });
  } catch (err) {
    return next(err);
  }
};
