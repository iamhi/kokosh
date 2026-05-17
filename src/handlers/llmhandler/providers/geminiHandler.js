import { GoogleGenAI } from '@google/genai';

let ai;

export const prepare = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  ai = new GoogleGenAI({ apiKey });
};

const debugLog = (label, data) => {
  if (process.env.LLM_DEBUG !== 'true') return;
  console.log(`[LLM Gemini] ${label}`, JSON.stringify(data, null, 2));
};

const adaptMessages = (messages) => {
  return messages.map((msg) => {
    if (msg.role === 'user') {
      const parts = [];
      if (msg.content) parts.push({ text: msg.content });
      // Ignoring images for now unless implemented fully in the prompt structures.
      return { role: 'user', parts };
    }
    if (msg.role === 'assistant') {
      const parts = [];
      if (msg.content) parts.push({ text: msg.content });
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        msg.tool_calls.forEach((tc) => {
          let args;
          try {
            args =
              typeof tc.function.arguments === 'string'
                ? JSON.parse(tc.function.arguments)
                : tc.function.arguments ?? {};
          } catch {
            args = {};
          }
          parts.push({
            functionCall: {
              name: tc.function.name,
              args,
            },
          });
        });
      }
      return { role: 'model', parts };
    }
    if (msg.role === 'tool') {
      return {
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: msg.name || 'unknown_tool',
              response: { result: msg.content },
            },
          },
        ],
      };
    }
    return { role: 'user', parts: [{ text: msg.content || '' }] };
  });
};

export const call = async ({ model, system, messages, tools = [] }) => {
  const contents = adaptMessages(messages);

  const config = {
    systemInstruction: { parts: [{ text: system }] },
  };

  if (tools && tools.length > 0) {
    const functionDeclarations = tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }));
    config.tools = [{ functionDeclarations }];
  }

  debugLog('request', { model, contents, config });

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    const result = {
      content: response.text || '',
      toolCalls: [],
      stopReason: 'stop',
    };

    if (response.functionCalls && response.functionCalls.length > 0) {
      result.toolCalls = response.functionCalls.map((fc, i) => ({
        id: `call_${Date.now()}_${i}`,
        name: fc.name,
        arguments: fc.args || {},
      }));
      result.stopReason = 'tool_calls';
    }

    debugLog('response', result);
    return result;
  } catch (err) {
    throw new Error(`Gemini request failed: ${err.message}`, { cause: err });
  }
};