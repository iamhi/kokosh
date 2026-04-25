import {
  callLlm as ollamaCall,
  prepare as ollamaPrepare,
} from './providers/ollamaHandler.js';

export const prepare = () => {
  ollamaPrepare();
};

export const callLlm = async (messages) => {
  ollamaCall(messages);
};
