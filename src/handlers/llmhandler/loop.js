import { executeToolCalls } from './tools/executor.js';

const DEFAULT_MAX_ITERATIONS = 20;
const COMPACTION_THRESHOLD = 40;
const DOOM_LOOP_THRESHOLD = 3;

const buildAssistantMessage = (response) => ({
  role: 'assistant',
  content: response.content || '',
  ...(response.toolCalls?.length
    ? {
        tool_calls: response.toolCalls.map((c) => ({
          id: c.id,
          type: 'function',
          function: { name: c.name, arguments: JSON.stringify(c.arguments) },
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

const compact = async (messages, system, provider, model) => {
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

  // Bug #2 fix: filter messages[0] from tail to prevent duplication
  const tail = messages.slice(-4).filter((m) => m !== messages[0]);
  return [
    messages[0],
    { role: 'assistant', content: `<context_summary>\n${content}\n</context_summary>` },
    ...tail,
  ];
};

const serializeToolCall = (call) =>
  JSON.stringify({ name: call.name, arguments: call.arguments });

export const agentLoop = async ({
  system,
  userPrompt,
  registry,
  provider,
  modelConfig,
  maxIterations = DEFAULT_MAX_ITERATIONS,
}) => {
  const toolSchemas = registry.toAPISchemas();
  let messages = [{ role: 'user', content: userPrompt }];
  const toolCallCounts = new Map();

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    if (messages.length > COMPACTION_THRESHOLD) {
      messages = await compact(messages, system, provider, modelConfig.summarization);
    }

    // Step 1: Tool dispatch
    const toolResponse = await provider.call({
      model: modelConfig.toolCalling,
      system,
      messages,
      tools: toolSchemas,
    });

    messages.push(buildAssistantMessage(toolResponse));

    // Use stopReason as the primary signal — no more tools means final synthesis
    if (toolResponse.stopReason === 'stop') {
      const final = await provider.call({
        model: modelConfig.synthesis,
        system,
        messages,
        tools: [],
      });
      return final.content;
    }

    // Doom-loop detection: same tool called with identical arguments DOOM_LOOP_THRESHOLD times
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

    // Step 2: Execute tools sequentially
    const results = await executeToolCalls(toolResponse.toolCalls, registry);
    messages.push(...buildToolResultMessages(results));

    // Step 3: Synthesis — digest results, update running understanding
    const synthesis = await provider.call({
      model: modelConfig.synthesis,
      system,
      messages,
      tools: [],
    });
    messages.push({ role: 'assistant', content: synthesis.content });
  }

  throw new Error(`Agent loop reached max iterations (${maxIterations}) without completing`);
};
