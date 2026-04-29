export const createSummerizer = (provider, model) => ({
  async summarize(messages, system) {
    const compactionSystem = [
      'Summarize the conversation below into a concise context block.',
      'Include: original goal, key tool results, conclusions reached, current state.',
      'Output only the summary, no preamble.',
    ].join('\n');

    const { content } = await provider.call({
      model,
      system: compactionSystem,
      messages,
      tools: [],
    });

    const tailStartIdx = Math.max(1, messages.length - 4);
    const tail = messages.slice(tailStartIdx);
    return [
      messages[0],
      { role: 'assistant', content: `<context_summary>\n${content}\n</context_summary>` },
      ...tail,
    ];
  },
});
