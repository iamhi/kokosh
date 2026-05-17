# Research Tool Recommendations & Improvements

This document outlines potential enhancements for the LLM service's research capabilities, building upon the existing `readFile`, `grep`, `glob`, and `webFetch` tools.

## 1. Web Search & Discovery [IMPLEMENTED]
The `web_search` tool is now implemented, supporting:
*   **DuckDuckGo (lite):** Default fallback using native `fetch`.
*   **Brave Search:** Supported via `BRAVE_API_KEY`.
*   **Google Custom Search:** Supported via `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_CX`.

## 2. Technical & Codebase Research
Deeper integration into the development environment.
*   **GitHub/Git Tooling:** Ability to search issues, read pull requests, and analyze commit history using Octokit.
*   **AST (Abstract Syntax Tree) Search:** Move beyond regex/grep to structural code searching (e.g., finding all implementations of an interface).
*   **Sandboxed Shell Execution:** Allow the LLM to run safe commands (e.g., `npm list`, `python --version`) or small scripts to verify environment state.

## 3. Document & Media Analysis
Handling non-text or structured data formats.
*   **PDF & Office Document Parser:** Libraries like `pdf-parse` or `mammoth` to extract text from whitepapers, manuals, and reports.
*   **Vision-Based Analysis:** If using a multi-modal model (Gemini Pro Vision), a tool to pass screenshots or diagrams for analysis.
*   **Structured Data Analysis:** A tool for running SQL-like queries on local CSV or JSON datasets.

## 4. Advanced Memory & Large Context
Handling research that spans many documents or long sessions.
*   **Semantic Search (RAG):** Using a Vector Database (e.g., Chroma, Pinecone) to perform similarity searches over large codebases or document sets.
*   **Persistent Scratchpad:** A dedicated tool for the LLM to save intermediate findings, hypotheses, and summaries that persist across multi-turn research loops.
