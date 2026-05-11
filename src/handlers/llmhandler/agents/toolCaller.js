export const createToolCaller = (provider, model) => ({
  async run(system, messages, tools) {
    return provider.call({ model, system, messages, tools });
  },
});
