const OLLAMA_CHAT_PATH = '/api/chat';

const OLLAMA_DEFAULT_CONFIG = {
  host: 'http://localhost:11434',
  model: 'llama3.2:1b',
};

let config = {};

export const prepare = () => {
  config = {
    url: OLLAMA_DEFAULT_CONFIG.host + OLLAMA_CHAT_PATH,
    model: OLLAMA_DEFAULT_CONFIG.model,
  };
};

export const callLlm = async (messages) => {
  const { system, user } = messages;

  const response = await fetch(config.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: system,
        },
        {
          role: 'user',
          content: user,
        },
      ],
      stream: false,
    }),
  });

  const data = await response.json();

  if (!data.message?.content) {
    let error = new Error();

    error.message = 'Content not present in ollama request';
    error.ollamaCallError = true;

    throw error;
  }

  return data.message?.content;
};
