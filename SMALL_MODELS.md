# Optimizing for Small Ollama Models

This project has been optimized to work with small models like `llama3.2:1b`, `phi3:mini`, and `mistral`.

## Key Features for Small Models

1. **Robust Tool Calling**: If a small model fails to use Ollama's native tool-calling API but instead outputs JSON in its response content, the system will automatically attempt to extract and execute those tool calls.
2. **Aggressive Context Management**: Small models have limited context windows. We've reduced the default `COMPACTION_THRESHOLD` and made it configurable.
3. **Structured Summarization**: The summarizer uses a more rigid, bulleted format to keep the context summary dense and readable for small models.
4. **Deterministic Tooling**: Tool calls are executed with `temperature: 0` by default to improve reliability.

## Recommended Configuration

Add these to your `.env` file for the best experience with small models:

```bash
# Model selection
OLLAMA_MODEL_TOOL_CALLING=llama3.2:1b
OLLAMA_MODEL_SYNTHESIS=llama3.2:1b
OLLAMA_MODEL_SUMMARIZATION=llama3.2:1b

# Context window (Ollama default is often 2048, we suggest 8192 if hardware allows)
OLLAMA_NUM_CTX=8192

# How many messages to keep before summarizing (lower is safer for small models)
COMPACTION_THRESHOLD=15

# How many messages to keep *after* the summary
COMPACTION_TAIL_COUNT=2

# Be more strict with hallucinations and loops
DOOM_LOOP_THRESHOLD=3
HALLUCINATION_THRESHOLD=2
```

## Tips for Prompting Small Models

- **Keep it simple**: Use direct instructions.
- **One task at a time**: Don't overwhelm the model with too many complex tools in one go.
- **Use JSON blocks**: If native tool calling is flaky, instruct the model to "Output your tool call in a JSON block like: ```json { "name": "...", "arguments": { ... } } ```". The system will catch this.
