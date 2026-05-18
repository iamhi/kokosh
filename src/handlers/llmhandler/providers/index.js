import * as ollamaProvider from './ollamaHandler.js';
import * as geminiProvider from './geminiHandler.js';

export const getProvider = () => {
  const providerType = process.env.LLM_PROVIDER || 'ollama';

  if (providerType === 'gemini') {
    return {
      provider: geminiProvider,
      defaultModelConfig: {
        toolCalling: process.env.GEMINI_MODEL_TOOL_CALLING || 'gemini-1.5-flash',
        synthesis: process.env.GEMINI_MODEL_SYNTHESIS || 'gemini-1.5-flash',
        summarization: process.env.GEMINI_MODEL_SUMMARIZATION || 'gemini-1.5-flash',
      },
    };
  }

  return {
    provider: ollamaProvider,
    defaultModelConfig: {
      toolCalling: process.env.OLLAMA_MODEL_TOOL_CALLING || 'llama3.2:1b',
      synthesis: process.env.OLLAMA_MODEL_SYNTHESIS || 'llama3.2:1b',
      summarization: process.env.OLLAMA_MODEL_SUMMARIZATION || 'llama3.2:1b',
    },
  };
};