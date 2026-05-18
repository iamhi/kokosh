import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { webSearchTool } from './webSearchTool.js';

describe('webSearchTool', () => {
  it('has the correct name', () => {
    assert.equal(webSearchTool.name, 'web_search');
  });

  it('fails if query is missing or empty', async () => {
    const result1 = await webSearchTool.execute({ query: '' });
    assert.match(result1, /Error: "query" parameter is required/);
    
    const result2 = await webSearchTool.execute({});
    assert.match(result2, /Error: "query" parameter is required/);
  });

  // Note: These tests make live network requests.
  // They might fail if there's no internet access or if DDG blocks the request.
  it('fetches results from DuckDuckGo (lite)', async () => {
    const result = await webSearchTool.execute({ query: 'nodejs', engine: 'duckduckgo' });
    if (result.includes('DuckDuckGo blocked the request')) {
      assert.match(result, /Error: DuckDuckGo blocked the request/);
    } else {
      assert.match(result, /DuckDuckGo Results/);
      assert.match(result, /nodejs/i);
    }
  });

  it('fails with helpful message if Brave key is missing', async () => {
    // Temporarily clear env key if it exists
    const oldKey = process.env.BRAVE_API_KEY;
    delete process.env.BRAVE_API_KEY;
    try {
      const result = await webSearchTool.execute({ query: 'test', engine: 'brave' });
      assert.match(result, /Error: BRAVE_API_KEY is not set/);
    } finally {
      process.env.BRAVE_API_KEY = oldKey;
    }
  });

  it('fails with helpful message if Google keys are missing', async () => {
    const oldKey = process.env.GOOGLE_SEARCH_API_KEY;
    const oldCx = process.env.GOOGLE_SEARCH_CX;
    delete process.env.GOOGLE_SEARCH_API_KEY;
    delete process.env.GOOGLE_SEARCH_CX;
    try {
      const result = await webSearchTool.execute({ query: 'test', engine: 'google' });
      assert.match(result, /Error: GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_CX is not set/);
    } finally {
      process.env.GOOGLE_SEARCH_API_KEY = oldKey;
      process.env.GOOGLE_SEARCH_CX = oldCx;
    }
  });
});
