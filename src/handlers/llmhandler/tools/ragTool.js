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
        return obj.feeds.map(f => `URL: ${f.url} | Category: ${f.category} | Description: ${f.description}`);
      }
    } catch {
      // Fallback
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
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

const getEmbedding = async (text, provider, config) => {
  if (provider === 'gemini') {
    const genAI = new GoogleGenAI(config.apiKey);
    const model = genAI.getGenerativeModel({ model: config.model });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } else {
    // Ollama
    const response = await fetch(`${config.host}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama embedding failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.embedding;
  }
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
    const provider = process.env.LLM_PROVIDER || 'ollama';
    const config = {};

    if (provider === 'gemini') {
      config.apiKey = process.env.GEMINI_API_KEY;
      config.model = 'embedding-001';
      if (!config.apiKey) return 'Error: GEMINI_API_KEY is required for Gemini RAG.';
    } else {
      config.host = process.env.OLLAMA_HOST_URL || 'http://localhost:11434';
      config.model = process.env.OLLAMA_MODEL_EMBEDDING || 'nomic-embed-text';
    }

    try {
      if (embeddingCache.length === 0) await loadCache();

      // Clear cache if model has changed (embeddings are model-specific)
      if (embeddingCache.length > 0 && embeddingCache[0].model !== config.model) {
        console.log(`🔄 RAG model changed from ${embeddingCache[0].model} to ${config.model}. Clearing cache.`);
        embeddingCache = [];
      }

      const files = [];
      for (const dir of RESEARCH_DIRS) files.push(...(await getFiles(dir)));

      let cacheUpdated = false;
      for (const file of files) {
        const fileStat = await stat(file);
        const mtime = fileStat.mtime.getTime();

        const existingFileChunks = embeddingCache.filter(c => c.path === file);
        if (existingFileChunks.length > 0 && existingFileChunks[0].mtime === mtime) {
          continue; 
        }

        embeddingCache = embeddingCache.filter(c => c.path !== file);

        console.log(`🔍 Indexing content: ${file} using ${config.model}`);
        const text = await readFile(file, 'utf8');
        const chunks = chunkText(text, file);
        
        for (const chunk of chunks) {
          const embedding = await getEmbedding(chunk, provider, config);
          embeddingCache.push({
            path: file,
            mtime,
            text: chunk,
            embedding,
            model: config.model
          });
        }
        cacheUpdated = true;
      }

      if (cacheUpdated) await saveCache();

      const queryEmbedding = await getEmbedding(query, provider, config);

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

      return `Top ${topResults.length} relevant snippets (Provider: ${provider}, Model: ${config.model}):\n\n${formatted.join('\n')}`;
    } catch (err) {
      return `Error in RAG: ${err.message}`;
    }
  },
};
