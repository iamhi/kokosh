import { run } from '../handlers/llmhandler/llmHandler.js';
import { runToolAgent } from './toolAgent.js';
import { 
  webSearchTool, 
  rssTool, 
  webFetchTool, 
  scratchpadTool, 
  ragTool 
} from '../handlers/llmhandler/tools/index.js';

const ORCHESTRATOR_TOOLS = [
  webSearchTool,
  rssTool,
  webFetchTool,
  scratchpadTool,
  ragTool
];

const ORCHESTRATOR_SYSTEM = `
You are the Brain Orchestrator. Your goal is to manage a research task by delegating work to specialized Tool Agents.

Process:
1. Analyze the research goal.
2. Decide on the next BEST tool to use.
3. Call the tool to delegate work. You can only call ONE tool per turn.
4. Once you receive the summary from the agent, decide if the goal is met or if you need another tool.
5. If the goal is met, finish by stating "RESEARCH_COMPLETE".

Available tools and when to use them:
- web_search: Discovery of general info and links.
- rss_fetch: Discovery of high-signal feeds.
- fetch_url: Deep reading of a specific website.
- research_scratchpad: Keeping track of long-term facts/notes.
- research_rag: Searching into trusted/internal sources.

DO NOT do the research yourself. ALWAYS use a tool agent to gather data.
`;

export async function runOrchestrator(goal, maxSteps = 10) {
  let context = `Goal: ${goal}\nFindings so far: None.`;
  const allFindings = [];

  for (let step = 1; step <= maxSteps; step++) {
    console.log(`🧠 Orchestrator Step ${step}/${maxSteps}`);
    
    // Orchestrator decides what to do
    const decision = await run({
      system: ORCHESTRATOR_SYSTEM,
      userPrompt: context,
      tools: ORCHESTRATOR_TOOLS, // Pass actual tool objects
      maxIterations: 1 // One decision at a time
    });

    // Check if Orchestrator called a tool
    if (decision.toolCalls && decision.toolCalls.length > 0) {
      const toolCall = decision.toolCalls[0]; // Only take the first one
      console.log(`🤖 Spawning Tool Agent for: ${toolCall.name}`);
      
      const agentResult = await runToolAgent({
        toolName: toolCall.name,
        toolArguments: toolCall.arguments,
        context: context,
        goal: goal
      });

      allFindings.push(agentResult);
      context += `\nStep ${step} (${toolCall.name}): ${agentResult.summary}`;
    }

    if (decision.answer?.includes('RESEARCH_COMPLETE') || step === maxSteps) {
      console.log('✅ Research goal achieved or max steps reached.');
      return allFindings;
    }
  }

  return allFindings;
}
