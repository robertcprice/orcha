# ChatGPT + Claude CLI Orchestrator

Orchestrates tasks using **ChatGPT for planning** and **Claude Code CLI for execution** (no Anthropic API needed).

## Features

- 🤖 **ChatGPT Planning**: Breaks down goals into concrete tasks
- ⚙️ **Claude CLI Execution**: Uses your existing Claude CLI authentication
- 🧠 **Advanced Reasoning**: Optional o1/o1-mini support for better planning
- 📊 **Progress Tracking**: Real-time status updates
- 💾 **Result Storage**: Save orchestration results as JSON

## Two-Step Reasoning (o1/o1-mini → gpt-4o)

The orchestrator supports a **two-step approach** for complex tasks:

1. **Step 1**: `o1` or `o1-mini` creates the plan (advanced reasoning, no JSON support)
2. **Step 2**: `gpt-4o` formats the plan as JSON (fast, supports structured output)

This combines the best of both models:
- **o1/o1-mini**: Superior reasoning and planning capabilities
- **gpt-4o**: Fast JSON formatting with structured outputs

## Quick Start

### Basic Usage (gpt-4o only)

```bash
python orchestrator/chatgpt_claude_cli_orchestrator.py \
  --goal "Create a Python script that prints 'Hello World'"
```

### With o1-mini (Better Reasoning)

```bash
python orchestrator/chatgpt_claude_cli_orchestrator.py \
  --goal "Download 1-minute BTC data from Binance for the last 30 days" \
  --reasoning-model o1-mini
```

### With o1 (Best Reasoning)

```bash
python orchestrator/chatgpt_claude_cli_orchestrator.py \
  --goal "Implement a complete backtesting system with Sharpe ratio calculation" \
  --reasoning-model o1
```

### Save Results

```bash
python orchestrator/chatgpt_claude_cli_orchestrator.py \
  --goal "Your goal" \
  --output results/my_task.json
```

### With Context

```bash
python orchestrator/chatgpt_claude_cli_orchestrator.py \
  --goal "Download SOL and XRP data" \
  --context '{"api_keys_path": "~/iCloud/code-projects", "timeframe": "1m", "days": 30}'
```

## Options

```bash
--goal              # (Required) Your goal
--reasoning-model   # Model for planning: gpt-4o (fast), o1-mini (better), o1 (best)
--context           # JSON context object
--output            # Save result to JSON file
--quiet             # Minimal output
```

## Model Comparison

| Model     | Speed | Reasoning | Cost | Best For |
|-----------|-------|-----------|------|----------|
| **gpt-4o**    | ⚡⚡⚡ Fast | ⭐⭐⭐ Good | $ Low | Simple tasks, quick iteration |
| **o1-mini**   | ⚡⚡ Moderate | ⭐⭐⭐⭐ Better | $$ Medium | Complex tasks, better planning |
| **o1**        | ⚡ Slower | ⭐⭐⭐⭐⭐ Best | $$$ High | Critical tasks, maximum reasoning |

## How It Works

### With gpt-4o (Single Step)

```
User Goal
    ↓
[ChatGPT-4o] → Analyzes & creates JSON plan
    ↓
[Claude CLI] → Executes task 1
[Claude CLI] → Executes task 2
[Claude CLI] → Executes task 3
    ↓
[ChatGPT-4o] → Summarizes results
    ↓
Final Report
```

### With o1/o1-mini (Two Steps)

```
User Goal
    ↓
[o1/o1-mini] → Deep reasoning & planning (text output)
    ↓
[ChatGPT-4o] → Formats as JSON
    ↓
[Claude CLI] → Executes task 1
[Claude CLI] → Executes task 2
[Claude CLI] → Executes task 3
    ↓
[ChatGPT-4o] → Summarizes results
    ↓
Final Report
```

## Examples

### Example 1: Data Download

```bash
python orchestrator/chatgpt_claude_cli_orchestrator.py \
  --goal "Download 1-minute candlestick data for BTC and ETH from Binance for the last 7 days" \
  --reasoning-model o1-mini \
  --output results/data_download.json
```

**Plan created**:
1. Research Binance API endpoints and authentication
2. Create Python script with ccxt library
3. Implement data download with error handling
4. Save data to CSV files
5. Verify data completeness and quality

### Example 2: Model Training

```bash
python orchestrator/chatgpt_claude_cli_orchestrator.py \
  --goal "Train a simple LSTM model to predict next-minute price direction" \
  --context '{"data_path": "data/btc_1m.csv", "epochs": 10}' \
  --reasoning-model o1-mini
```

**Plan created**:
1. Load and preprocess data
2. Create train/val/test splits
3. Build LSTM architecture
4. Train model with early stopping
5. Evaluate on test set
6. Generate performance report

### Example 3: Documentation

```bash
python orchestrator/chatgpt_claude_cli_orchestrator.py \
  --goal "Create comprehensive API documentation for the trading system" \
  --reasoning-model gpt-4o
```

## Setup Requirements

### 1. Environment Variables

Add to `.env`:

```bash
OPENAI_API_KEY=sk-proj-your-key-here
```

### 2. Claude CLI

Make sure you're authenticated with Claude CLI:

```bash
claude --help
```

If not installed, see: https://docs.claude.com/claude-code

### 3. Python Dependencies

```bash
pip install openai python-dotenv
```

## Tips

### When to Use Each Model

**Use gpt-4o when:**
- Task is straightforward and well-defined
- You need quick iteration
- Cost is a concern

**Use o1-mini when:**
- Task requires planning multiple steps
- You need better reasoning quality
- Task involves complex logic or algorithms
- Balance of cost and quality matters

**Use o1 when:**
- Task is mission-critical
- Maximum reasoning quality is essential
- Task involves complex architecture decisions
- Cost is not a primary concern

### Optimizing Performance

1. **Be specific in goals**: "Download BTC 1m data for last 7 days" is better than "Get some data"

2. **Provide context**: Include relevant paths, parameters, constraints

3. **Use appropriate model**: Don't use o1 for simple file operations

4. **Review plans**: The orchestrator shows the plan before execution

## Troubleshooting

### Claude CLI hangs

Make sure your Claude CLI is working:
```bash
echo "print 42" | claude --print --dangerously-skip-permissions
```

### OpenAI API errors

Check your API key:
```bash
grep OPENAI_API_KEY .env
```

### Task timeout

Default timeout is 5 minutes per task. Complex tasks may need the code adjusted.

## Advanced Usage

### Custom Agents

The planner assigns tasks to these agents:
- **CODE**: Feature implementation, algorithms
- **DATA**: Data processing, ETL pipelines
- **TRAIN**: Model training, experiments
- **QA**: Testing, debugging, verification
- **DOC**: Documentation, guides
- **RD**: Research, exploration

### Accessing Results

Results are saved with:
- `status`: "completed" or "failed"
- `plan_id`: Unique plan identifier
- `tasks_total`: Number of tasks
- `tasks_completed`: Successfully completed
- `duration`: Total time in seconds
- `results`: Per-task results
- `summary`: Human-readable summary

```python
import json

with open('results/my_task.json') as f:
    result = json.load(f)

print(f"Status: {result['status']}")
print(f"Completed: {result['tasks_completed']}/{result['tasks_total']}")
print(f"Time: {result['duration']:.1f}s")
print(f"\nSummary:\n{result['summary']}")
```

## See Also

- [ChatGPT Planner](chatgpt_planner.py) - Planning component
- [Claude CLI Docs](https://docs.claude.com/claude-code) - Claude Code documentation
- [OpenAI o1 Guide](https://platform.openai.com/docs/guides/reasoning) - o1 reasoning models
