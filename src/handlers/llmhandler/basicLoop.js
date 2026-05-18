import { executeToolCalls } from './tools/executor.js';

const DEFAULT_MAX_ITERATIONS = parseInt(process.env.MAX_ITERATIONS, 10) || 20;
const COMPACTION_THRESHOLD = parseInt(process.env.COMPACTION_THRESHOLD, 10) || 20; // Reduced for small models
const DOOM_LOOP_THRESHOLD = parseInt(process.env.DOOM_LOOP_THRESHOLD, 10) || 5; // More aggressive
const HALLUCINATION_THRESHOLD = parseInt(process.env.HALLUCINATION_THRESHOLD, 10) || 2;

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
    name: r.name,
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

  if (process.env.LLM_DEBUG === 'true') {
    console.log(`[Agent] Starting loop with model for prompt: "${userPrompt.slice(0, 50)}..."`);
  }

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    // 4. summarize when context grows too large
    if (messages.length > COMPACTION_THRESHOLD) {
      if (process.env.LLM_DEBUG === 'true') {
        console.log(`[Agent] Compacting context: ${messages.length} messages exceeds threshold of ${COMPACTION_THRESHOLD}`);
      }
      messages = await summerizer.summarize(messages, system);
    }

    // 1. do a function call
    if (process.env.LLM_DEBUG === 'true') console.log(`[Agent] Iteration ${iteration}/${maxIterations}`);
    const toolResponse = await toolCaller.run(system, messages, toolSchemas);
    
    // Check for "empty but stopped" state common in small models
    if (!toolResponse.content && (!toolResponse.toolCalls || toolResponse.toolCalls.length === 0)) {
       if (process.env.LLM_DEBUG === 'true') console.log(`[Agent] Model returned empty content and no tools.`);
       toolResponse.stopReason = 'stop';
    }

    messages.push(buildAssistantMessage(toolResponse));

    // 2. synthesis — model is done, produce final answer
    if (toolResponse.stopReason === 'stop' || (toolResponse.content && toolResponse.toolCalls.length === 0)) {
      const answer = toolResponse.content || await synthesis.run(system, messages);
      return { answer, toolCalls: allToolCalls };
    }

    let disableTools = false;
    for (const call of toolResponse.toolCalls) {
      const toolCallRecord = {
        id: call.id,
        name: call.name,
        arguments: call.arguments,
      };
      allToolCalls.push(toolCallRecord);

      const key = serializeToolCall(call);
      const count = (toolCallCounts.get(key) ?? 0) + 1;
      toolCallCounts.set(key, count);
      if (count >= DOOM_LOOP_THRESHOLD) {
        if (process.env.LLM_DEBUG === 'true') {
          console.warn(`[Agent] Doom loop detected for tool "${call.name}". Disabling tools and forcing synthesis.`);
        }
        disableTools = true;
        break; 
      }
    }

    if (disableTools) {
      // If we hit a doom loop, we don't execute the tools. 
      // Instead, we force a synthesis in the next iteration or right now.
      messages.push({ 
        role: 'user', 
        content: 'System notice: Multiple repetitive tool calls detected. Please provide a final answer based on the information you already have, without calling any more tools.' 
      });
      const answer = await synthesis.run(system, messages);
      return { answer, toolCalls: allToolCalls };
    }

    // 3. loop if yes — execute tools and continue
    const results = await executeToolCalls(toolResponse.toolCalls, registry);
    messages.push(...buildToolResultMessages(results));

    // Update records with results
    for (const res of results) {
      const record = allToolCalls.find((c) => c.id === res.id);
      if (record) {
        record.result = res.result;
      }
    }

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

  if (process.env.LLM_DEBUG === 'true') {
    console.warn(`[Agent] Reached max iterations (${maxIterations}). Returning partial results.`);
  }
  return { 
    answer: messages.at(-1)?.content || "Max iterations reached", 
    toolCalls: allToolCalls,
    partial: true
  };
};
