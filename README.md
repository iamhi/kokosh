# Kokosh: AI Research Agent Service

Kokosh is a high-performance, tool-augmented AI agent service designed for deep research, codebase analysis, and information synthesis. It bridges the gap between raw LLM capabilities and practical engineering/research workflows by providing a persistent, iterative environment equipped with specialized discovery and analysis tools.

---

## 🚀 Core Features

### 1. Intelligent Agent Loop
Kokosh operates on an iterative **Plan → Act → Observe** loop. It doesn't just answer questions; it uses its tools to gather evidence, explore files, and search the web until it reaches a grounded conclusion.

### 2. Specialized Research Toolset
*   **Web Discovery:** 
    *   `web_search`: Multi-engine search (Google, Brave, DuckDuckGo).
    *   `rss_fetch`: High-signal discovery via RSS/Atom feeds.
    *   `fetch_url`: Full browser rendering (Puppeteer/Playwright) to Markdown conversion.
*   **Document Analysis:**
    *   `parse_pdf`: Deep text and metadata extraction from PDF whitepapers and reports.
    *   **Vision Support:** Direct image analysis for diagrams and screenshots (Gemini only).
*   **Codebase & File Exploration:**
    *   `read_file`, `grep_files`, `glob_files`, `list_directory`: Surgical access to local data and source code.
*   **Advanced Memory:**
    *   `research_scratchpad`: A persistent "notebook" for tracking facts and hypotheses across long sessions.
    *   `research_rag`: Semantic search (Vector Search) over all gathered research documents using Google Embeddings.

### 3. Flexible Infrastructure
*   **Multi-Provider:** Switch between **Google Gemini** (for high-reasoning and vision) and **Ollama** (for private, local execution).
*   **Context Compaction:** Automatically summarizes long conversation histories to prevent "context overflow" during extensive research tasks.

---

## 🛠 Usage Instructions

### 1. Environment Setup
Create a `.env` file in the root directory (refer to `.env.example`):

```env
# Provider Choice: 'gemini' or 'ollama'
LLM_PROVIDER=gemini

# Google Gemini Config
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL_TOOL_CALLING=gemini-2.5-flash

# Ollama Config (if using local)
OLLAMA_HOST_URL=http://localhost:11434
OLLAMA_MODEL_TOOL_CALLING=llama3.2
```

### 2. Running the Service

#### Web Interface (Recommended)
Launch the sleek web dashboard to interact with the agent visually.
```bash
npm start
```
Access at `http://localhost:5000`. Features real-time tool call inspection and character counters.

#### CLI Runner
Execute research tasks directly from your terminal.
```bash
npm run llm -- -s prompts/system.md -u prompts/user.md
```
*   `-s`: Path to system instructions.
*   `-u`: Path to your research query.
*   `-o`: (Optional) Path to save the final markdown result.

### 3. API Integration
Integrate Kokosh into your own apps via the REST API.

**Endpoint:** `POST /api/llm`

**Payload Example:**
```json
{
  "system": "You are a market researcher.",
  "user": "Find the latest trends in renewable energy for 2026.",
  "tools": ["web_search", "fetch_url", "research_scratchpad"],
  "maxIterations": 10
}
```

---

## 📂 Project Structure

*   `src/handlers/llmhandler/`: The core agent logic and loop implementation.
*   `src/handlers/llmhandler/tools/`: The library of capabilities (RAG, RSS, PDF, etc.).
*   `src/handlers/llmhandler/providers/`: Connectors for Gemini and Ollama.
*   `public/`: The single-page application (SPA) frontend.
*   `scratch/`: Default directory for gathered research artifacts and the scratchpad.

---

## 🛡 Security & Guardrails
*   **Directory Guard:** Prevents the LLM from accessing sensitive system folders.
*   **Doom Loop Protection:** Automatically detects and stops the agent if it gets stuck in repetitive tool calls.
*   **Rate Limiting:** Built-in API protection for production deployments.
