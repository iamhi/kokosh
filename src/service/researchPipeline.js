import { runOrchestrator } from './orchestrator.js';
import { runFinalSynthesizer } from './finalSynthesizer.js';

export async function executeTask(task) {
  console.log(`🚀 Starting Orchestrated Research: ${task.id}`);

  try {
    const goal = `${task.system}\n\nTask: ${task.user}`;
    
    // 1. Start Orchestrator (it will spawn ToolAgents and persist results)
    const findings = await runOrchestrator(goal, task.maxIterations || 10);

    // 2. Trigger Final Synthesis
    console.log(`📊 Research complete. Synthesizing final report for ${task.id}...`);
    const finalReport = await runFinalSynthesizer(goal, findings);

    console.log(`✅ Pipeline finished. Final report saved to ${finalReport.filePath}`);
  } catch (error) {
    console.error(`❌ Error in research pipeline for ${task.id}:`, error);
  }
}
