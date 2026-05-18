# New Research Capabilities Roadmap

This document outlines the priority research tools and architectural improvements for the LLM service, focusing on gathering, analyzing, and remembering information.

## 1. Discovery: RSS & Feeds
To complement `web_search`, an RSS tool will provide a low-overhead method for monitoring news and updates.
*   **RSS Tool (`rss_fetch`):** 
    *   Use `fast-xml-parser` to parse XML feeds.
    *   Return a structured list of titles, links, and publication dates.
    *   Allow the LLM to quickly scan high-signal sources (Bloomberg, Reuters, specialized blogs) without browser rendering.

## 2. Document & Media Analysis
Moving beyond plain text and HTML to handle professional and visual research materials.
*   **PDF Parser (`parse_pdf`):**
    *   Integrate a library like `pdf-parse` to extract text content from local or fetched PDF files.
    *   Essential for analyzing whitepapers, financial reports, and technical manuals.
*   **Vision-Based Research:**
    *   Fully enable image passing in the `geminiHandler.js`.
    *   Allow the LLM to analyze diagrams, charts, and screenshots gathered during web research to extract visual data.

## 3. Advanced Memory & Large Context
Enhancing the agent's ability to handle high volumes of research data and maintain long-term coherence.
*   **Semantic Search (RAG):**
    *   Implement a tool to index the `scratch/web/` and `scratch/reports/` directories.
    *   Use local embeddings (or provider-based) to allow the LLM to "query" its collected research base rather than manually grepping files.
*   **Persistent Scratchpad:**
    *   A dedicated tool for the LLM to write, append to, and read from a `research_notes.md` file.
    *   Unlike the conversation summary, this persists specifically for "facts and hypotheses," preventing important details from being lost during context compaction.

## 4. Synthesis & Reporting
*   **Automated Research Pipeline:**
    *   As outlined in the market research plan, use these tools in a multi-agent workflow.
    *   Phase 1: Discovery (RSS/Search).
    *   Phase 2: Deep Dive (Fetch/PDF/Vision).
    *   Phase 3: Synthesis (using Scratchpad and RAG to build the final report).
