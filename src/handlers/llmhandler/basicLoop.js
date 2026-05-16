import { executeToolCalls } from './tools/executor.js';

const DEFAULT_MAX_ITERATIONS = parseInt(process.env.MAX_ITERATIONS, 10) || 20;
const COMPACTION_THRESHOLD = 40;
const DOOM_LOOP_THRESHOLD = parseInt(process.env.DOOM_LOOP_THRESHOLD, 10) || 10;
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
  images,
  registry,
  toolCaller,
  synthesis,
  summerizer,
  maxIterations = DEFAULT_MAX_ITERATIONS,
}) => {
  const toolSchemas = registry.toAPISchemas();
  const userMessage = { role: 'user', content: userPrompt };
  if (images?.length) userMessage.images = images;
  let messages = [userMessage];
  const toolCallCounts = new Map();
  let hallucinationStreak = 0;
  const allToolCalls = [];

  const throwWithCalls = (message) => {
    const err = new Error(message);
    err.toolCalls = allToolCalls;
    throw err;
  };

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
      const answer = toolResponse.content || await synthesis.run(system, messages);
      return { answer, toolCalls: allToolCalls };
    }

    for (const call of toolResponse.toolCalls) {
      allToolCalls.push({ name: call.name, arguments: call.arguments });

      const key = serializeToolCall(call);
      const count = (toolCallCounts.get(key) ?? 0) + 1;
      toolCallCounts.set(key, count);
      if (count >= DOOM_LOOP_THRESHOLD) {
        throwWithCalls(
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
        throwWithCalls(
          `Hallucination: model called non-existent tool(s) [${names}] for ${hallucinationStreak} consecutive iterations`
        );
      }
    } else {
      hallucinationStreak = 0;
    }
  }

  throwWithCalls(
    `Agent loop reached max iterations (${maxIterations}) without completing`
  );
};
