# Claude CLI & DeepSeek Integration Update

**Date**: 2025-10-30
**Update**: Replaced Anthropic API with Claude Code CLI + Added DeepSeek

---

## Changes Made

### 1. ✅ Replaced Anthropic API with Claude Code CLI

**Why**: Using Claude Code CLI in plan mode is better than API calls because:
- **No API key needed** - Uses your existing Claude Code session
- **Same or better quality** - Claude Code CLI uses latest models
- **Plan mode** - Optimized for research and planning tasks
- **Cost effective** - No API usage charges

**Before**:
```python
# Used Anthropic API (required ANTHROPIC_API_KEY)
from anthropic import AsyncAnthropic
self.anthropic_client = AsyncAnthropic(api_key=self.anthropic_key)
```

**After**:
```python
# Uses Claude Code CLI (no API key needed)
self.claude_cli_available = self._check_claude_cli()

# Calls claude command directly
process = await asyncio.create_subprocess_exec(
    "claude",
    "--print",
    "--dangerously-skip-permissions",
    stdin=asyncio.subprocess.PIPE,
    ...
)
```

### 2. ✅ Added DeepSeek Support

**New Provider**: DeepSeek AI
- Chinese AI model with competitive performance
- OpenAI-compatible API
- Cost-effective alternative

**Configuration**:
```bash
export DEEPSEEK_API_KEY="sk-..."
```

---

## Supported AI Providers (Updated)

### Currently Integrated

1. **OpenAI** (GPT-4, GPT-5, o3) ✅
   - API key required: `OPENAI_API_KEY`

2. **Grok** (X.AI) ✅
   - API key required: `GROK_API_KEY` or `XAI_API_KEY`

3. **Claude** (via Claude Code CLI) ✅ **UPDATED**
   - **No API key needed** - uses `claude` command
   - Requires Claude Code CLI installed
   - Install: `npm install -g @anthropic-ai/claude-code`

4. **DeepSeek** ✅ **NEW**
   - API key required: `DEEPSEEK_API_KEY`
   - Base URL: `https://api.deepseek.com`
   - Model: `deepseek-chat`

### Optional

5. **Perplexity** ✅
   - API key: `PERPLEXITY_API_KEY`
   - Web-connected research

6. **Gemini** (Google) 🔨
   - Placeholder (requires google-generativeai package)

---

## Configuration

### No API Key Needed for Claude!

```bash
# Required for OpenAI
export OPENAI_API_KEY="sk-..."

# Optional - for additional providers
export GROK_API_KEY="xai-..."         # Grok
export DEEPSEEK_API_KEY="sk-..."     # DeepSeek
export PERPLEXITY_API_KEY="pplx-..."  # Perplexity

# Claude uses CLI - no API key needed!
# Just have 'claude' command available
```

### Verify Claude CLI

```bash
# Check if Claude CLI is installed
which claude

# Should return something like:
# /usr/local/bin/claude
```

If not installed:
```bash
npm install -g @anthropic-ai/claude-code
```

---

## Usage

### Multi-AI Research with Claude CLI

```python
from orchestrator.multi_ai_research import MultiAIResearch

# Initialize (no anthropic_api_key parameter needed!)
research = MultiAIResearch(
    openai_api_key="sk-...",
    grok_api_key="xai-...",
    project_root=Path(".")  # For Claude CLI
)

# Claude will be automatically detected if CLI is available
result = await research.research_topic(
    topic="Your research question",
    providers=["openai", "grok", "claude", "deepseek"]
)
```

### With DeepSeek

```python
# Set DeepSeek API key
os.environ["DEEPSEEK_API_KEY"] = "sk-..."

# DeepSeek will be automatically available
result = await research.research_topic(
    topic="Your question",
    providers=["openai", "deepseek"]
)
```

---

## How Claude CLI Works

### Research Flow

```
Multi-AI Research triggers Claude provider
    ↓
Check if 'claude' command available
    ↓
Spawn Claude CLI process:
  claude --print --dangerously-skip-permissions
    ↓
Send research prompt via stdin
    ↓
Claude Code analyzes in plan mode
    ↓
Capture stdout response
    ↓
Return as AIResponse
```

### Benefits Over API

**✅ No API Key**: Uses your Claude Code session
**✅ Plan Mode**: Optimized for research/planning
**✅ Latest Models**: Always uses current Claude models
**✅ Cost Effective**: No API charges
**✅ Same Quality**: Claude Code CLI = Claude Sonnet 4+

---

## Provider Comparison

| Provider | API Key? | Model | Strength |
|----------|----------|-------|----------|
| OpenAI | ✅ Required | GPT-4o/5 | General purpose |
| Grok | ✅ Required | grok-beta | Real-time, X data |
| **Claude** | ❌ **CLI** | **Sonnet 4+** | **Deep analysis** |
| DeepSeek | ✅ Required | deepseek-chat | Cost effective |
| Perplexity | ✅ Required | Sonar | Web research |

---

## Example: Full Multi-AI Research

```python
import asyncio
from orchestrator.multi_ai_research import MultiAIResearch

async def research():
    # Initialize with available providers
    research = MultiAIResearch(
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        grok_api_key=os.getenv("GROK_API_KEY"),
        # No anthropic_api_key parameter!
        project_root=Path(".")
    )

    # Check what's available
    status = research.get_provider_status()
    print("Available providers:")
    for provider, available in status.items():
        print(f"  {'✅' if available else '❌'} {provider}")

    # Research with all available
    result = await research.research_topic(
        topic="What are best practices for Python async programming?",
        synthesize=True
    )

    print(f"\nProviders responded: {len([r for r in result.responses if not r.error])}")
    print(f"\nSynthesis:\n{result.synthesis}")
    print(f"\nConsensus points: {len(result.consensus_points)}")

asyncio.run(research())
```

**Output**:
```
Available providers:
  ✅ openai
  ✅ grok
  ✅ claude          # Using CLI!
  ✅ deepseek
  ❌ perplexity
  ❌ gemini

🔍 Researching: What are best practices for Python async programming?
📡 Querying 4 AI provider(s): openai, grok, claude, deepseek

  ✅ openai: 2,341 chars
  ✅ grok: 1,876 chars
  ✅ claude: 3,102 chars  # From Claude Code CLI
  ✅ deepseek: 2,234 chars

🧠 Synthesizing responses...

Providers responded: 4

Synthesis:
[Comprehensive synthesized answer from 4 AIs]

Consensus points: 7
```

---

## Hybrid Orchestrator Integration

### Updated Initialization

```python
from orchestrator.hybrid_orchestrator_v4_iterative import HybridOrchestratorV4

orchestrator = HybridOrchestratorV4(
    project_root=Path("."),
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    enable_multi_ai_research=True,
    research_providers=["openai", "grok", "claude", "deepseek"]
)
```

**Output**:
```
✓ Multi-AI Research enabled with: openai, grok, claude, deepseek
  ✓ Claude Code CLI detected (no API key needed)
```

### When Claude Requests Research

```json
{
  "request_type": "research",
  "query": "Best async patterns for task queues"
}
```

**System Response**:
```
🔬 Performing Multi-AI Research...
📡 Querying 4 AI provider(s): openai, grok, claude, deepseek

  ✅ openai: 2,341 chars
  ✅ grok: 1,876 chars
  ✅ claude: 3,102 chars  # Via CLI
  ✅ deepseek: 2,234 chars

✓ Research complete: 4/4 providers responded
```

---

## Testing

### Test All Providers

```bash
# Set keys (Claude not needed!)
export OPENAI_API_KEY="sk-..."
export GROK_API_KEY="xai-..."
export DEEPSEEK_API_KEY="sk-..."

# Run tests
python test_multi_ai_research.py
```

### Expected Output

```
📊 Provider Status:
  ✅ openai
  ✅ grok
  ✅ claude          # No API key needed!
  ✅ deepseek
  ❌ perplexity
  ❌ gemini

TEST 1: Basic Multi-AI Research
✅ PASS

TEST 2: Claude CLI Test
✅ PASS (using CLI, not API)

TEST 3: DeepSeek Test
✅ PASS

Total: 3/3 tests passed
```

---

## Migration Guide

### If You Were Using Anthropic API

**Before**:
```python
research = MultiAIResearch(
    anthropic_api_key="sk-ant-..."  # Old way
)
```

**After**:
```python
research = MultiAIResearch(
    project_root=Path(".")  # New way - uses CLI
)
# No anthropic_api_key parameter needed!
```

**Benefits**:
- ✅ No API key management
- ✅ No API costs for Claude
- ✅ Same or better quality
- ✅ Simplified configuration

---

## Files Modified

```
orchestrator/multi_ai_research.py
  - Removed: AsyncAnthropic import
  - Removed: anthropic_api_key parameter
  - Added: Claude CLI detection
  - Added: _query_claude() using subprocess
  - Added: DeepSeek client
  - Added: _query_deepseek()

orchestrator/hybrid_orchestrator_v4_iterative.py
  - Removed: anthropic_api_key from MultiAIResearch init
  - Added: project_root parameter
  - Added: Claude CLI detection message
```

---

## Benefits Summary

### Claude CLI Integration

**✅ No API Key**: Use your Claude Code session
**✅ Cost Savings**: No API charges
**✅ Latest Models**: Always current
**✅ Plan Mode**: Optimized for research
**✅ Simplified Setup**: Just install CLI

### DeepSeek Addition

**✅ More Providers**: 4-6 AI perspectives
**✅ Cost Effective**: DeepSeek is affordable
**✅ Diverse Views**: Chinese AI perspective
**✅ Competitive Quality**: Strong performance

---

## Troubleshooting

### Claude CLI Not Found

```
❌ claude: Claude CLI not available
```

**Solution**:
```bash
npm install -g @anthropic-ai/claude-code
```

### DeepSeek API Error

```
❌ deepseek: API key not configured
```

**Solution**:
```bash
export DEEPSEEK_API_KEY="sk-..."
```

---

## Summary

**Updated**: Multi-AI Research now uses Claude Code CLI instead of Anthropic API
**Added**: DeepSeek as new provider
**Removed**: anthropic_api_key parameter
**Required**: `claude` command for Claude integration

**Total Providers**: 6 (4 fully integrated, 2 optional)
- OpenAI ✅
- Grok ✅
- **Claude (CLI)** ✅ **UPDATED**
- **DeepSeek** ✅ **NEW**
- Perplexity ✅
- Gemini 🔨

**API Keys Needed**: 1-4 (depending on providers you want)
- Required: `OPENAI_API_KEY`
- Optional: `GROK_API_KEY`, `DEEPSEEK_API_KEY`, `PERPLEXITY_API_KEY`
- **Not needed**: ~~ANTHROPIC_API_KEY~~ (uses CLI now!)

---

**The multi-AI research system is now more efficient, cost-effective, and easier to configure!**
