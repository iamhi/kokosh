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

const normalizeToolCalls = (toolCalls = []) => {
  return toolCalls.map((call, i) => {
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
};

export const call = async ({ model, system, messages, tools = [] }) => {
  const body = {
    model,
    messages: [{ role: 'system', content: system }, ...messages],
    stream: false,
  };

  if (tools.length > 0) {
    body.tools = tools;
  }

  debugLog('request', body);

  const response = await fetch(config.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const message = data.message;

  if (!message) {
    throw new Error('No message in Ollama response');
  }

  const result = {
    content: message.content || '',
    toolCalls: normalizeToolCalls(message.tool_calls),
    stopReason:
      data.done_reason || (message.tool_calls?.length ? 'tool_calls' : 'stop'),
  };

  debugLog('response', result);

  return result;
};
