import { webSearchTool } from './webSearchTool.js';
import { rssTool } from './rssTool.js';
import { webFetchTool } from './webFetchTool.js';
import { scratchpadTool } from './scratchpadTool.js';
import { ragTool } from './ragTool.js';
import { readFileTool } from './readFileTool.js';
import { writeFileTool } from './writeFileTool.js';
import { grepTool } from './grepTool.js';
import { globTool } from './globTool.js';
import { listDirTool } from './listDirTool.js';
import { pdfTool } from './pdfTool.js';

const tools = [
  webSearchTool,
  rssTool,
  webFetchTool,
  scratchpadTool,
  ragTool,
  readFileTool,
  writeFileTool,
  grepTool,
  globTool,
  listDirTool,
  pdfTool
];

export const allTools = tools;

export const getToolByName = (name) => allTools.find(t => t.name === name);

export {
  webSearchTool,
  rssTool,
  webFetchTool,
  scratchpadTool,
  ragTool,
  readFileTool,
  writeFileTool,
  grepTool,
  globTool,
  listDirTool,
  pdfTool
};
