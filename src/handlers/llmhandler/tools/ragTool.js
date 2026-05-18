import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { GoogleGenAI } from '@google/genai';

const RESEARCH_DIRS = ['scratch/web', 'scratch/reports', 'trusted_rss.json'];
const CACHE_PATH = resolve(process.cwd(), 'scratch/rag_index.json');

let embeddingCache = []; 

const loadCache = async () => {
  try {
    const data = await readFile(CACHE_PATH, 'utf8');
    embeddingCache = JSON.parse(data);
    console.log(`📦 Loaded ${embeddingCache.length} chunks from RAG cache.`);
  } catch {
    embeddingCache = [];
  }
};

const saveCache = async () => {
  try {
    await writeFile(CACHE_PATH, JSON.stringify(embeddingCache), 'utf8');
  } catch (err) {
    console.error('Failed to save RAG cache:', err);
  }
};

const getFiles = async (dir) => {
  const absolutePath = resolve(process.cwd(), dir);
  if (dir.endsWith('.json') || dir.endsWith('.md') || dir.endsWith('.txt')) {
    try {
      await stat(absolutePath);
      return [absolutePath];
    } catch {
      return [];
    }
  }
  let files = [];
  try {
    const entries = await readdir(absolutePath, { withFileTypes: true });
    for (const entry of entries) {
      const res = join(absolutePath, entry.name);
      if (entry.isDirectory()) {
        files = [...files, ...(await getFiles(res))];
      } else if (['.md', '.txt', '.json'].includes(extname(entry.name).toLowerCase())) {
        files.push(res);
      }
    }
  } catch {}
  return files;
};

const chunkText = (text, file) => {
  if (file.endsWith('.json')) {
    try {
      const obj = JSON.parse(text);
      if (obj.feeds && Array.isArray(obj.feeds)) {
        // One chunk per RSS feed entry for maximum precision
        return obj.feeds.map(f => `URL: ${f.url} | Category: ${f.category} | Description: ${f.description}`);
      }
    } catch {
      // Fallback to text chunking if JSON is malformed
    }
  }
  
  const chunks = [];
  const size = 1000;
  const overlap = 200;
  let start = 0;
  while (start < text.length) {
    chunks.push(text.substring(start, start + size));
    start += size - overlap;
  }
  return chunks;
};

const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const ragTool = {
  name: 'research_rag',
  description: 'Search through gathered research and trusted RSS databases using semantic search.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query.' },
      topK: { type: 'number', description: 'Number of results. Defaults to 5.' },
    },
    required: ['query'],
  },
  execute: async ({ query, topK = 5 }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return 'Error: GEMINI_API_KEY is required.';

    try {
      if (embeddingCache.length === 0) await loadCache();

      const genAI = new GoogleGenAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'embedding-001' });

      const files = [];
      for (const dir of RESEARCH_DIRS) files.push(...(await getFiles(dir)));

      let cacheUpdated = false;
      for (const file of files) {
        const fileStat = await stat(file);
        const mtime = fileStat.mtime.getTime();

        // Check if file has been updated or is new
        const existingFileChunks = embeddingCache.filter(c => c.path === file);
        if (existingFileChunks.length > 0 && existingFileChunks[0].mtime === mtime) {
          continue; 
        }

        // Remove old versions of this file from cache
        embeddingCache = embeddingCache.filter(c => c.path !== file);

        console.log(`🔍 Indexing new content: ${file}`);
        const text = await readFile(file, 'utf8');
        const chunks = chunkText(text, file);
        
        for (let i = 0; i < chunks.length; i++) {
          const result = await model.embedContent(chunks[i]);
          embeddingCache.push({
            path: file,
            mtime,
            text: chunks[i],
            embedding: result.embedding.values,
          });
        }
        cacheUpdated = true;
      }

      if (cacheUpdated) await saveCache();

      const queryResult = await model.embedContent(query);
      const queryEmbedding = queryResult.embedding.values;

      const scored = embeddingCache.map(chunk => ({
        text: chunk.text,
        path: chunk.path,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }));

      scored.sort((a, b) => b.score - a.score);
      const topResults = scored.slice(0, topK);

      const formatted = topResults.map((res, i) => {
        const relPath = res.path.replace(process.cwd(), '').replace(/^\//, '');
        return `${i + 1}. [Score: ${res.score.toFixed(3)}] Source: ${relPath}\nSnippet: ${res.text.trim()}\n`;
      });

      return `Top ${topResults.length} relevant snippets:\n\n${formatted.join('\n')}`;
    } catch (err) {
      return `Error in RAG: ${err.message}`;
    }
  },
};
