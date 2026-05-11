const SYNTHESIS_PROMPT =
  'Based on the information gathered above, provide a complete answer to the original question.';

export const createSynthesis = (provider, model) => ({
  async run(system, messages) {
    const trimmed =
      messages.at(-1)?.role === 'assistant' && !messages.at(-1)?.content
        ? messages.slice(0, -1)
        : messages;

    const { content } = await provider.call({
      model,
      system,
      messages: [...trimmed, { role: 'user', content: SYNTHESIS_PROMPT }],
      tools: [],
    });
    return content;
  },
});
