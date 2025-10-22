# Orchestration Quick Start

Your ChatGPT + Claude CLI orchestrator is ready! 🚀

**Status**: ✅ Working (fixed timeout issue on 2025-10-09)

## Simplest Usage

```bash
./run_orchestrator.sh --goal "Your goal here"
```

That's it! It will:
1. Use **gpt-5** (OpenAI's latest model, released August 2025) for advanced planning
2. Use **gpt-4o** to format as JSON
3. Use **Claude CLI** to execute
4. Give you a summary

## Examples

### Quick Tasks (gpt-4o only, faster)

```bash
REASONING_MODEL=gpt-4o ./run_orchestrator.sh \
  --goal "Create a hello world script"
```

### Most Tasks (GPT-5 - default)

```bash
./run_orchestrator.sh \
  --goal "Download 1m data for SOL and XRP from Binance for the last 30 days"
```

### Alternative Models

```bash
# Use o3 (advanced reasoning model)
REASONING_MODEL=o3 ./run_orchestrator.sh --goal "Your goal"

# Use o3-mini (faster reasoning)
REASONING_MODEL=o3-mini ./run_orchestrator.sh --goal "Your goal"

# Use o1 (older reasoning model)
REASONING_MODEL=o1 ./run_orchestrator.sh --goal "Your goal"
```

## With Your Binance Task

```bash
./run_orchestrator.sh \
  --goal "Download 1-minute candlestick data for SOL and XRP from Binance for as long a time period as possible. Use API keys from iCloud/code-projects" \
  --context '{"api_keys_path": "~/Library/Mobile Documents/com~apple~CloudDocs/code-projects"}' \
  --output results/binance_download.json
```

## Model Choice

| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| **gpt-5** | ⚡⚡ | ⭐⭐⭐⭐⭐ | $$ | Most tasks (BEST model, released Aug 2025) |
| **o3** | ⚡⚡ | ⭐⭐⭐⭐ | $$ | Alternative reasoning model |
| **o3-mini** | ⚡⚡⚡ | ⭐⭐⭐ | $ | Faster reasoning |
| **o1** | ⚡ | ⭐⭐⭐⭐ | $$$ | Older reasoning (slower) |
| **gpt-4o** | ⚡⚡⚡ | ⭐⭐⭐ | $ | Quick tasks only |

**Default**: `gpt-5` (OpenAI's latest and best model as of August 2025)

**Note**: GPT-5 was released in August 2025 and is OpenAI's most advanced model, with state-of-the-art performance across coding, math, writing, and reasoning.

## What You Get

The orchestrator will:
1. **Plan** the work (breaking it into tasks)
2. **Show you** the plan before starting
3. **Execute** each task with Claude CLI
4. **Verify** each task completed successfully
5. **Summarize** what was accomplished

## Files Created

- **`orchestrator/chatgpt_claude_cli_orchestrator.py`** - Main script
- **`run_orchestrator.sh`** - Quick wrapper
- **`orchestrator/README_ORCHESTRATION.md`** - Full documentation
- **`.env`** - Contains your OpenAI API key

## Need Help?

```bash
python orchestrator/chatgpt_claude_cli_orchestrator.py --help
```

Or check the full docs:
```bash
cat orchestrator/README_ORCHESTRATION.md
```

## Tips

1. **Be specific**: "Download BTC 1m data for 30 days" vs "Get some data"
2. **Provide context**: File paths, API keys location, constraints
3. **Use o1-mini** for most tasks (good balance of quality and cost)
4. **Save results**: Use `--output results/task.json` to keep records

---

**Your orchestration system is production-ready!** No Anthropic API key needed - uses your existing Claude CLI authentication.
