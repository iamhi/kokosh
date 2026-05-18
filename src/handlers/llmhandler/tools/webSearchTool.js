import { NodeHtmlMarkdown } from 'node-html-markdown';

export const webSearchTool = {
  name: 'web_search',
  description: `Search the web for information using a search engine.
Returns search results including titles, URLs, and snippets.
Use this tool to find up-to-date information, documentation, or discover URLs to fetch later with the fetch_url tool.`,
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query string.',
      },
      engine: {
        type: 'string',
        description: 'Optional: the search engine to use (duckduckgo, brave, google, all). If "all", queries all available engines sequentially. Defaults to available engines.',
        enum: ['duckduckgo', 'brave', 'google', 'all'],
      },
    },
    required: ['query'],
  },
  execute: async ({ query, engine }) => {
    if (typeof query !== 'string' || query.trim() === '') {
      return 'Error: "query" parameter is required and must be a non-empty string.';
    }

    const braveKey = process.env.BRAVE_API_KEY;
    const googleKey = process.env.GOOGLE_SEARCH_API_KEY;
    const googleCx = process.env.GOOGLE_SEARCH_CX;

    const availableEngines = [];
    if (braveKey) availableEngines.push('brave');
    if (googleKey && googleCx) availableEngines.push('google');
    availableEngines.push('duckduckgo');

    let enginesToUse = [];
    if (engine === 'all') {
      enginesToUse = availableEngines;
    } else if (engine) {
      if (availableEngines.includes(engine)) {
        enginesToUse = [engine];
      } else {
        const missing = engine === 'brave' ? 'BRAVE_API_KEY' : 'GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_CX';
        return `Error: ${missing} is not set. Cannot use ${engine} search engine.`;
      }
    } else {
      // Default behavior: use the first available high-quality engine, or DDG
      enginesToUse = [availableEngines[0]];
    }

    const allResults = [];
    for (const selectedEngine of enginesToUse) {
      let result;
      if (selectedEngine === 'brave') {
        result = await searchBrave(query, braveKey);
      } else if (selectedEngine === 'google') {
        result = await searchGoogle(query, googleKey, googleCx);
      } else {
        result = await searchDuckDuckGo(query);
      }
      allResults.push(`--- Search Engine: ${selectedEngine.toUpperCase()} ---\n${result}`);
    }

    return allResults.join('\n\n');
  },
};

const searchBrave = async (query, apiKey) => {
  try {
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    });
    
    if (!response.ok) {
      return `Error from Brave API: ${response.status} ${response.statusText}`;
    }

    const data = await response.json();
    const results = data.web?.results || [];
    
    if (results.length === 0) return 'No results found.';

    return results.map((r, i) => `${i + 1}. Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.description}\n`).join('\n');
  } catch (err) {
    return `Error fetching from Brave Search: ${err.message}`;
  }
};

const searchGoogle = async (query, apiKey, cx) => {
  try {
    const response = await fetch(`https://customsearch.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${cx}`);
    
    if (!response.ok) {
      return `Error from Google API: ${response.status} ${response.statusText}`;
    }

    const data = await response.json();
    const results = data.items || [];
    
    if (results.length === 0) return 'No results found.';

    return results.map((r, i) => `${i + 1}. Title: ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet}\n`).join('\n');
  } catch (err) {
    return `Error fetching from Google Search: ${err.message}`;
  }
};

const searchDuckDuckGo = async (query) => {
  try {
    const response = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: 'q=' + encodeURIComponent(query),
    });

    if (!response.ok) {
      return `Error from DuckDuckGo: ${response.status} ${response.statusText}`;
    }

    const html = await response.text();
    
    if (html.includes('error-lite@duckduckgo.com') || html.includes('ddg-captcha')) {
      return 'Error: DuckDuckGo blocked the request (bot detection). Try a different search engine or query.';
    }

    // Convert to markdown for easier parsing/reading
    const markdown = new NodeHtmlMarkdown().translate(html);
    
    // Clean up obvious boilerplate
    let cleaned = markdown.replace(/\[\+\]|\[-\]/g, '');
    
    // Simple truncation
    if (cleaned.length > 8000) {
      cleaned = cleaned.substring(0, 8000) + '\n...[truncated]';
    }
    
    return "DuckDuckGo Results (Markdown Format):\n\n" + cleaned;
  } catch (err) {
    return `Error fetching from DuckDuckGo: ${err.message}`;
  }
};
