export const createSynthesis = (provider, model) => ({
  async run(system, messages) {
    const { content } = await provider.call({
      model,
      system,
      messages,
      tools: [],
    });
    return content;
  },
});
