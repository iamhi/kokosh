export const createSummerizer = (provider, model) => ({
  async summarize(messages, system) {
    const compactionSystem = [
      '### INSTRUCTION',
      'Summarize the conversation into a dense context block.',
      'Identify: Goal, Progress, Key Data, Next Steps.',
      'Format as a bulleted list.',
      'NO preamble, NO conversational filler.',
    ].join('\n');

    const { content } = await provider.call({
      model,
      system: compactionSystem,
      messages,
      tools: [],
      options: { temperature: 0.2 } // More deterministic summarization
    });

    // For small models, we keep fewer messages in the tail to avoid context overflow
    const tailCount = parseInt(process.env.COMPACTION_TAIL_COUNT, 10) || 3;
    const tailStartIdx = Math.max(1, messages.length - tailCount);
    const tail = messages.slice(tailStartIdx);
    
    return [
      messages[0], // Keep the original user message if possible
      { 
        role: 'assistant', 
        content: `### CONTEXT_SUMMARY\n${content}\n---\nContinuing the task based on this summary.` 
      },
      ...tail,
    ];
  },
});
