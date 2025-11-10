# Multi-AI Research Integration

Comprehensive research capability using multiple AI providers for enhanced accuracy, consensus building, and diverse perspectives.

## Overview

The Multi-AI Research module enables the hybrid orchestrator to query multiple AI providers simultaneously, synthesize their responses, and identify consensus and divergent points. This provides more robust and comprehensive research capabilities.

## Supported AI Providers

### Currently Integrated

1. **OpenAI** (GPT-4, GPT-5, o3)
   - Standard research and synthesis
   - JSON formatting support
   - Fast responses

2. **Grok** (X.AI)
   - Real-time knowledge (if configured)
   - Alternative perspective
   - OpenAI-compatible API

3. **Claude** (Anthropic)
   - Deep analysis
   - Long-form responses
   - Claude Sonnet 4

### Optional (Configurable)

4. **Perplexity**
   - Web-connected research
   - Citation support
   - Online knowledge

5. **Gemini** (Google)
   - Requires `google-generativeai` package
   - Placeholder integration provided

## Configuration

### Environment Variables

Set API keys in your environment:

```bash
# Required for hybrid orchestrator
export OPENAI_API_KEY="sk-..."

# Optional for multi-AI research
export GROK_API_KEY="xai-..."           # or XAI_API_KEY
export ANTHROPIC_API_KEY="sk-ant-..."
export PERPLEXITY_API_KEY="pplx-..."
export GEMINI_API_KEY="..."
```

### Hybrid Orchestrator Configuration

When creating the hybrid orchestrator:

```python
from orchestrator.hybrid_orchestrator_v4_iterative import HybridOrchestratorV4

orchestrator = HybridOrchestratorV4(
    project_root=Path("."),
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    gpt_model="gpt-4o",
    enable_multi_ai_research=True,  # Enable multi-AI research
    research_providers=["openai", "grok", "claude"]  # Specify providers
)
```

### Standalone Usage

```python
from orchestrator.multi_ai_research import MultiAIResearch

# Initialize with API keys
research = MultiAIResearch(
    openai_api_key="sk-...",
    grok_api_key="xai-...",
    anthropic_api_key="sk-ant-..."
)

# Research a topic
result = await research.research_topic(
    topic="What are the best practices for async Python?",
    providers=["openai", "grok", "claude"],
    synthesize=True
)
```

## Usage in Hybrid Orchestrator

### Request Types

Claude can request different types of information:

1. **research** (uses Multi-AI Research)
   ```json
   {
     "request_type": "research",
     "query": "What are the performance implications of different Python async patterns?"
   }
   ```

2. **web_search** (uses DuckDuckGo)
   ```json
   {
     "request_type": "web_search",
     "query": "latest Python 3.13 features"
   }
   ```

3. **context**, **advice**, **examples** (uses single AI)
   ```json
   {
     "request_type": "context",
     "query": "How does the current codebase handle authentication?"
   }
   ```

### Claude's Perspective

When Claude needs research, it outputs:

```json
{
  "request_type": "research",
  "query": "Your research question here",
  "details": {
    "context": "Additional context",
    "scope": "What aspects to focus on"
  }
}
```

The orchestrator then:
1. Detects `request_type: "research"`
2. Uses Multi-AI Research module
3. Queries configured providers in parallel
4. Synthesizes responses
5. Returns comprehensive answer to Claude

## Research Result Structure

```python
@dataclass
class ResearchResult:
    topic: str                          # Original research question
    responses: List[AIResponse]         # Individual AI responses
    synthesis: Optional[str]            # Synthesized unified answer
    consensus_points: List[str]         # Points all AIs agree on
    divergent_points: List[str]         # Different perspectives
    sources: List[str]                  # Cited sources
    created_at: str                     # Timestamp
```

### AI Response Structure

```python
@dataclass
class AIResponse:
    provider: str                       # "openai", "grok", "claude"
    model: str                          # Specific model used
    content: str                        # Full response
    confidence: Optional[float]         # Confidence score (if available)
    sources: List[str]                  # Citations
    metadata: Dict[str, Any]            # Additional info (tokens, etc.)
    error: Optional[str]                # Error message if failed
    timestamp: str                      # When generated
```

## Example Workflow

### 1. User Request

```
User: "Implement async task queue with retry logic"
```

### 2. Claude Analysis

Claude analyzes and requests research:

```json
{
  "request_type": "research",
  "query": "What are the best patterns for implementing async task queues with retry logic in Python? Compare different approaches and libraries.",
  "details": {
    "context": "Need production-ready solution with error handling",
    "requirements": ["async/await", "retry mechanism", "error handling", "monitoring"]
  }
}
```

### 3. Multi-AI Research Execution

System queries 3 providers in parallel:

```
🔬 Performing Multi-AI Research: What are the best patterns for implementing...
📡 Querying 3 AI provider(s): openai, grok, claude

  ✅ openai: 2,341 chars
  ✅ grok: 1,876 chars
  ✅ claude: 3,102 chars

🧠 Synthesizing responses...
✓ Research complete: 3/3 providers responded
```

### 4. Synthesized Response

```markdown
## Unified Answer

For async task queues with retry logic, the industry consensus points to several proven patterns:

**Core Approaches:**
1. **Celery with async workers** - Battle-tested, feature-rich
2. **asyncio.Queue with custom retry** - Lightweight, full control
3. **aio-pika + RabbitMQ** - Enterprise-grade messaging
4. **arq (async redis queue)** - Modern, Python-first design

**Consensus Points:**
- Use exponential backoff for retries
- Implement dead-letter queues for failed tasks
- Add structured logging for debugging
- Monitor queue depth and processing time

**Different Perspectives:**
- OpenAI suggests Celery for teams familiar with it
- Grok emphasizes arq for new greenfield projects
- Claude recommends custom solution for fine-grained control
```

### 5. Claude Implementation

With comprehensive research, Claude implements the solution with:
- Well-informed architecture choices
- Multiple approaches considered
- Best practices incorporated
- Edge cases handled

## Benefits

### 1. Consensus Building

Multiple AI providers help identify:
- **Universal best practices** - What all AIs agree on
- **Industry standards** - Common patterns across responses
- **Proven approaches** - Techniques validated by multiple sources

### 2. Diverse Perspectives

Different AI models bring:
- **Varied training data** - Different knowledge bases
- **Unique insights** - Alternative solutions
- **Complementary strengths** - Grok's real-time, Claude's depth, GPT's breadth

### 3. Error Mitigation

With multiple providers:
- **Reduces hallucination** - Cross-validation between AIs
- **Catches inconsistencies** - Divergent points highlighted
- **Provides alternatives** - If one approach has issues, others available

### 4. Enhanced Accuracy

Synthesis process:
- **Filters noise** - Common points elevated
- **Aggregates knowledge** - Best from each provider
- **Validates information** - Multiple sources confirm facts

## Testing

### Run Tests

```bash
# Set API keys first
export OPENAI_API_KEY="sk-..."
export GROK_API_KEY="xai-..."
export ANTHROPIC_API_KEY="sk-ant-..."

# Run test suite
python test_multi_ai_research.py
```

### Test Output

```
============================================================
MULTI-AI RESEARCH TEST SUITE
============================================================

============================================================
TEST 1: Basic Multi-AI Research
============================================================

📊 Provider Status:
  ✅ openai
  ✅ grok
  ✅ claude
  ❌ perplexity
  ❌ gemini

🔍 Researching: What are the best practices for async/await in Python?
📡 Querying 3 AI provider(s): openai, grok, claude

  ✅ openai: 2,145 chars
  ✅ grok: 1,923 chars
  ✅ claude: 2,891 chars

🧠 Synthesizing responses...

============================================================
RESULTS
============================================================

[Individual responses and synthesis displayed]

============================================================
TEST SUMMARY
============================================================
✅ PASS: basic_research
✅ PASS: grok_specific
✅ PASS: convenience_function

Total: 3/3 tests passed
```

## API Reference

### MultiAIResearch Class

```python
class MultiAIResearch:
    def __init__(
        self,
        openai_api_key: Optional[str] = None,
        anthropic_api_key: Optional[str] = None,
        grok_api_key: Optional[str] = None,
        perplexity_api_key: Optional[str] = None,
        gemini_api_key: Optional[str] = None,
        timeout: float = 60.0
    )
```

### research_topic Method

```python
async def research_topic(
    self,
    topic: str,
    providers: Optional[List[str]] = None,
    models: Optional[Dict[str, str]] = None,
    synthesize: bool = True,
    context: Optional[str] = None
) -> ResearchResult
```

**Parameters:**
- `topic`: Research question or topic
- `providers`: List of providers to use (default: all available)
- `models`: Optional dict mapping provider -> model name
- `synthesize`: Whether to synthesize responses (default: True)
- `context`: Additional context for research

### Convenience Function

```python
async def research_with_multiple_ai(
    topic: str,
    providers: Optional[List[str]] = None,
    **kwargs
) -> ResearchResult
```

Quick access function for one-off research.

## Advanced Usage

### Custom Model Selection

```python
result = await research.research_topic(
    topic="Compare async frameworks",
    providers=["openai", "grok", "claude"],
    models={
        "openai": "gpt-5",      # Use GPT-5 for OpenAI
        "grok": "grok-beta",    # Use Grok Beta
        "claude": "claude-sonnet-4-20250514"  # Use Claude Sonnet 4
    }
)
```

### Disable Synthesis

For raw responses without synthesis:

```python
result = await research.research_topic(
    topic="Your question",
    synthesize=False  # Get individual responses only
)

# Access individual responses
for response in result.responses:
    print(f"{response.provider}: {response.content}")
```

### Provider Selection

```python
# Use only specific providers
result = await research.research_topic(
    topic="Your question",
    providers=["grok", "claude"]  # Skip OpenAI
)
```

### Check Provider Status

```python
research = MultiAIResearch()
status = research.get_provider_status()

for provider, available in status.items():
    print(f"{provider}: {'✅' if available else '❌'}")
```

## Integration with Hybrid Orchestrator

The Multi-AI Research module is automatically integrated into Hybrid Orchestrator V4:

```python
# When Claude requests research:
InformationRequest(
    request_type="research",  # Triggers multi-AI research
    query="Your research question",
    details={"additional": "context"}
)

# Orchestrator automatically:
# 1. Detects research request
# 2. Queries multiple AI providers in parallel
# 3. Synthesizes responses
# 4. Returns comprehensive answer to Claude
```

## Performance Considerations

### Parallel Execution

All AI providers are queried in parallel using `asyncio.gather()`:
- **Fast**: Responses arrive simultaneously
- **Efficient**: No sequential waiting
- **Resilient**: One provider's failure doesn't block others

### Typical Timing

- **Single provider**: 2-5 seconds
- **3 providers (parallel)**: 3-7 seconds
- **Synthesis**: +2-3 seconds

Total: ~5-10 seconds for complete multi-AI research with synthesis

### Cost Optimization

```python
# Use fewer providers for simpler questions
result = await research.research_topic(
    topic="Simple syntax question",
    providers=["openai"]  # Just one provider
)

# Use all providers for complex research
result = await research.research_topic(
    topic="Compare complex architectures",
    providers=["openai", "grok", "claude", "perplexity"]  # All available
)
```

## Troubleshooting

### No Providers Available

```
ValueError: No AI providers available. Please set API keys.
```

**Solution**: Set at least one API key:
```bash
export OPENAI_API_KEY="sk-..."
# or
export GROK_API_KEY="xai-..."
# or
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Provider Timeout

```
⚠️ Multi-AI Research failed: timeout, falling back to single AI
```

**Solution**: Increase timeout:
```python
research = MultiAIResearch(timeout=120.0)  # 2 minutes
```

### Synthesis Failure

If synthesis fails, individual responses are still available:

```python
if not result.synthesis:
    # Fallback: use individual responses
    for response in result.responses:
        if not response.error:
            print(response.content)
```

## Future Enhancements

### Planned Features

1. **Streaming responses** - Display results as they arrive
2. **Caching** - Reuse responses for similar queries
3. **Custom synthesis** - User-defined synthesis logic
4. **Weighted consensus** - Weight providers by reliability
5. **Source validation** - Cross-check citations

### Additional Providers

- Gemini (Google) - Full integration
- Mistral - European AI perspective
- Cohere - Specialized embeddings/search

## Examples

See `test_multi_ai_research.py` for complete working examples.

## Summary

The Multi-AI Research integration provides:

✅ **Multiple AI providers** - OpenAI, Grok, Claude, Perplexity
✅ **Parallel querying** - Fast, efficient execution
✅ **Response synthesis** - Unified, comprehensive answers
✅ **Consensus analysis** - Identify agreement across AIs
✅ **Divergence tracking** - Surface different perspectives
✅ **Integrated with hybrid orchestrator** - Automatic research capability
✅ **Fallback support** - Degrades gracefully if providers unavailable

This enables Claude to make better-informed decisions based on comprehensive, multi-perspective research.
