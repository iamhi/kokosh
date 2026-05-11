export const executeToolCalls = async (toolCalls, registry) => {
  const results = [];
  for (const call of toolCalls) {
    const tool = registry.get(call.name);
    if (!tool) {
      results.push({
        id: call.id,
        name: call.name,
        result: `Error: unknown tool "${call.name}"`,
      });
      continue;
    }
    try {
      const result = await tool.execute(call.arguments);
      results.push({ id: call.id, name: call.name, result: String(result) });
    } catch (err) {
      results.push({
        id: call.id,
        name: call.name,
        result: `Error executing "${call.name}": ${err.message}`,
      });
    }
  }
  return results;
};
