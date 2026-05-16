const devLog = process.env.NODE_ENV !== 'production';

export const executeToolCalls = async (toolCalls, registry) => {
  const results = [];
  for (const call of toolCalls) {
    if (devLog) {
      console.log(`[tool] ${call.name}`, JSON.stringify(call.arguments));
    }
    const tool = registry.get(call.name);
    if (!tool) {
      if (devLog) console.warn(`[tool] unknown: "${call.name}"`);
      results.push({
        id: call.id,
        name: call.name,
        result: `Error: unknown tool "${call.name}"`,
      });
      continue;
    }
    try {
      const result = await tool.execute(call.arguments);
      if (devLog) console.log(`[tool] ${call.name} OK`);
      results.push({ id: call.id, name: call.name, result: String(result) });
    } catch (err) {
      if (devLog) console.error(`[tool] ${call.name} ERR:`, err.message);
      results.push({
        id: call.id,
        name: call.name,
        result: `Error executing "${call.name}": ${err.message}`,
      });
    }
  }
  return results;
};
