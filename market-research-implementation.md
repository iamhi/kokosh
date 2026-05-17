# Implementation Plan: Market Research Pipeline (Updated)

## Objective
To build an automated, scheduled pipeline that performs market research using discrete LLM discovery agents (e.g., RSS, Web Search). These agents will gather information into intermediate files, and a final synthesis agent will compile them into a single, cohesive blog-style Markdown report. The execution of the discovery agents must support configurable concurrency to handle both local (weaker hardware) and cloud (Gemini SDK) environments.

## Architecture Overview
1. **Trigger:** A cron job runs 3 times daily (e.g., 8:00, 14:00, 20:00).
2. **Discovery Phase:**
   - Multiple specialized LLM tasks are defined (e.g., "General Market News via RSS", "Specific Stock Trends via Web Search").
   - These tasks are executed according to a `MAX_CONCURRENCY` setting.
   - Each task saves its output to a unique intermediate markdown file in `scratch/reports/`.
3. **Synthesis Phase:**
   - A final LLM task reads all intermediate files using `readFileTool`.
   - It produces a single, high-quality blog post.
   - The final report is saved to `public/reports/` for static hosting.

## Key Components

### 1. Discovery Tools
- **RSS Tool (`src/handlers/llmhandler/tools/rssTool.js`):**
  - **Status: Pending.**
  - Uses `fast-xml-parser` to fetch and parse feeds.
  - Returns structured JSON of titles, links, and summaries.
- **Search Tool (`src/handlers/llmhandler/tools/webSearchTool.js`):**
  - **Status: Implemented.**
  - Supports Brave, Google, and DuckDuckGo.
  - Returns search results to help the agent discover URLs for deeper fetching.

### 2. Pipeline Orchestrator (`src/service/researchPipeline.js`)
- **Status: Pending.**
- **Configurable Parallelism:** Uses a concurrency-limited promise pool or a simple loop/batching logic to respect hardware constraints.
- **State Management:** Orchestrates the flow from raw data gathering to intermediate storage, then to final synthesis.
- **Cleanup:** Handles management of the `scratch/reports/` directory to ensure each run starts fresh.

### 3. Automation & Scheduling
- **Scheduler (`src/service/scheduler.js`):**
  - **Status: Pending.**
  - Uses `node-cron` to schedule runs.
  - Provides a manual trigger for debugging.
- **App Lifecycle:** Initialize the scheduler in `src/service/start.js`.

## Implementation Steps (Next Sessions)
1. **RSS Tooling:** Implement `rssTool.js` to allow the LLM to read market feeds (Bloomberg, Reuters, etc.).
2. **Orchestration:** Create the `researchPipeline.js` logic to run multiple LLM instances with specific prompts and toolsets.
3. **Storage Setup:** Ensure `scratch/reports/` and `public/reports/` directories are correctly handled by `directoryGuard.js`.
4. **Scheduling:** Install `node-cron` and wire the scheduler into the server's boot sequence in `start.js`.

## Verification Strategy
- **Unit Tests:** For `rssTool.js` parsing logic.
- **Integration Test:** A CLI script to trigger a full mock pipeline run.
- **Stress Test:** Verify that `MAX_CONCURRENCY=1` correctly sequences tasks without memory spikes.
