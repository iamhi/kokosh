import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

const OLLAMA_CHAT_PATH = '/api/chat';

const debugLog = (label, data) => {
  if (process.env.LLM_DEBUG !== 'true') return;
  console.log(`[LLM] ${label}`, JSON.stringify(data, null, 2));
};

let config = {};

export const prepare = () => {
  config = {
    url:
      (process.env.OLLAMA_HOST_URL || 'http://localhost:11434') +
      OLLAMA_CHAT_PATH,
  };
};

const normalizeToolCalls = (toolCalls = [], content = '') => {
  const normalized = toolCalls.map((call, i) => {
    let args;
    try {
      args =
        typeof call.function.arguments === 'string'
          ? JSON.parse(call.function.arguments)
          : (call.function.arguments ?? {});
    } catch {
      args = {};
    }
    return {
      id: call.id || `call_${i}`,
      name: call.function.name,
      arguments: args,
    };
  });

  // Fallback: If no native tool calls, try to find JSON in content (common for small models)
  if (normalized.length === 0 && content.includes('{') && content.includes('}')) {
    try {
      // Very simple extraction for common patterns like markdown blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        // If it looks like a tool call: { "name": "...", "arguments": { ... } }
        if (parsed.name && parsed.arguments) {
          normalized.push({
            id: `call_fallback_${Date.now()}`,
            name: parsed.name,
            arguments: parsed.arguments
          });
        } 
        // Or a list of tool calls
        else if (Array.isArray(parsed)) {
          parsed.forEach((item, i) => {
            if (item.name && item.arguments) {
              normalized.push({
                id: `call_fallback_${i}_${Date.now()}`,
                name: item.name,
                arguments: item.arguments
              });
            }
          });
        }
      }
    } catch (e) {
      // Ignore fallback errors
    }
  }

  return normalized;
};

const adaptMessages = (messages) =>
  messages.map((msg) => {
    if (msg.role !== 'assistant' || !msg.tool_calls) return msg;
    return {
      ...msg,
      tool_calls: msg.tool_calls.map((tc) => ({
        ...tc,
        function: {
          ...tc.function,
          arguments:
            typeof tc.function.arguments === 'string'
              ? (() => {
                  try {
                    return JSON.parse(tc.function.arguments);
                  } catch {
                    return {};
                  }
                })()
              : (tc.function.arguments ?? {}),
        },
      })),
    };
  });

/**
 * Custom request helper using node:http/https to avoid undici fetch timeouts
 */
const httpRequest = (url, options) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 120000,
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data),
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      const err = new Error('Request timed out');
      err.name = 'AbortError';
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
};

export const call = async ({ model, system, messages, tools = [], options = {} }) => {
  // Default options optimized for small models
  const ollamaOptions = {
    num_ctx: parseInt(process.env.OLLAMA_NUM_CTX, 10) || 8192,
    temperature: options.temperature ?? (tools.length > 0 ? 0 : 0.7), // Lower temp for tool calling
    top_p: options.top_p ?? 0.9,
    ...options,
  };

  const body = {
    model,
    messages: adaptMessages([{ role: 'system', content: system }, ...messages]),
    stream: false,
    options: ollamaOptions,
  };

  if (tools.length > 0) {
    body.tools = tools;
  }

  debugLog('request', body);

  const timeoutMs = parseInt(process.env.OLLAMA_TIMEOUT, 10) || 120000; // 2 minute default

  const executeRequest = async (attempt = 1) => {
    try {
      if (process.env.LLM_DEBUG === 'true') {
        const bodySize = Buffer.byteLength(JSON.stringify(body));
        console.log(`[Ollama] Request attempt ${attempt}, size: ${(bodySize / 1024).toFixed(2)}KB`);
      }

      const response = await httpRequest(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        timeout: timeoutMs,
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        throw new Error(
          `Ollama request failed: ${response.status} ${response.statusText}${bodyText ? ` — ${bodyText}` : ''}`
        );
      }

      const data = await response.json();
      const message = data.message;

      if (!message) {
        throw new Error('No message in Ollama response');
      }

      const toolCalls = normalizeToolCalls(message.tool_calls, message.content);

      const result = {
        content: message.content || '',
        toolCalls: toolCalls,
        stopReason: toolCalls.length > 0
          ? 'tool_calls'
          : (data.done_reason || 'stop'),
      };

      debugLog('response', result);
      return result;
    } catch (err) {
      const isTimeout = err.name === 'AbortError' || err.code === 'UND_ERR_HEADERS_TIMEOUT' || err.message === 'Request timed out';
      
      if (isTimeout && attempt < 2) {
        console.warn(`[Ollama] Request timed out after ${timeoutMs}ms. Retrying once...`);
        return executeRequest(attempt + 1);
      }

      if (isTimeout) {
        throw new Error(
          `Ollama request timed out after ${timeoutMs}ms${attempt > 1 ? ` (after ${attempt} attempts)` : ''}. This usually happens if the model is too large for your hardware, the context is too large, or the model is still loading. Try increasing OLLAMA_TIMEOUT in your .env file or using a smaller model.`,
          { cause: err }
        );
      }
      throw err;
    }
  };

  return executeRequest();
};

