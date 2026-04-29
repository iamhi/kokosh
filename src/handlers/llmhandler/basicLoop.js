import { executeToolCalls } from './tools/executor.js';

const DEFAULT_MAX_ITERATIONS = 20;
const COMPACTION_THRESHOLD = 40;
const DOOM_LOOP_THRESHOLD = 3;
const HALLUCINATION_THRESHOLD = 3;

const buildAssistantMessage = (response) => ({
  role: 'assistant',
  content: response.content || '',
  ...(response.toolCalls?.length
    ? {
        tool_calls: response.toolCalls.map((c) => ({
          id: c.id,
          type: 'function',
          function: { name: c.name, arguments: c.arguments },
        })),
      }
    : {}),
});

const buildToolResultMessages = (results) =>
  results.map((r) => ({
    role: 'tool',
    content: r.result,
    tool_call_id: r.id,
  }));

const serializeToolCall = (call) =>
  JSON.stringify({ name: call.name, arguments: call.arguments });

export const agentLoop = async ({
  system,
  userPrompt,
  registry,
  toolCaller,
  synthesis,
  summerizer,
  maxIterations = DEFAULT_MAX_ITERATIONS,
}) => {
  const toolSchemas = registry.toAPISchemas();
  let messages = [{ role: 'user', content: userPrompt }];
  const toolCallCounts = new Map();
  let hallucinationStreak = 0;

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    // 4. summerize when context grows too large
    if (messages.length > COMPACTION_THRESHOLD) {
      messages = await summerizer.summarize(messages, system);
    }

    // 1. do a function call
    const toolResponse = await toolCaller.run(system, messages, toolSchemas);
    messages.push(buildAssistantMessage(toolResponse));

    // 2. synthesis — model is done, produce final answer
    if (toolResponse.stopReason === 'stop') {
      return toolResponse.content || synthesis.run(system, messages);
    }

    for (const call of toolResponse.toolCalls) {
      const key = serializeToolCall(call);
      const count = (toolCallCounts.get(key) ?? 0) + 1;
      toolCallCounts.set(key, count);
      if (count >= DOOM_LOOP_THRESHOLD) {
        throw new Error(
          `Doom loop: tool "${call.name}" called with identical arguments ${count} times`
        );
      }
    }

    // 3. loop if yes — execute tools and continue
    const results = await executeToolCalls(toolResponse.toolCalls, registry);
    messages.push(...buildToolResultMessages(results));

    const unknownTools = results.filter((r) =>
      r.result.startsWith('Error: unknown tool "')
    );

    if (unknownTools.length > 0) {
      hallucinationStreak++;
      if (hallucinationStreak >= HALLUCINATION_THRESHOLD) {
        const names = [...new Set(unknownTools.map((r) => r.name))].join(', ');
        throw new Error(
          `Hallucination: model called non-existent tool(s) [${names}] for ${hallucinationStreak} consecutive iterations`
        );
      }
    } else {
      hallucinationStreak = 0;
    }
  }

  throw new Error(
    `Agent loop reached max iterations (${maxIterations}) without completing`
  );
};
