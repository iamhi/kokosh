export const createRegistry = () => {
  const tools = new Map();
  return {
    register: (tool) => tools.set(tool.name, tool),
    get: (name) => tools.get(name),
    toAPISchemas: () =>
      [...tools.values()].map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
  };
};
