# Multi-AI Invocation Skill

**Purpose:** Invoke multiple AI models (Gemini, DeepSeek, Grok, etc.) for specialized tasks like planning, analysis, research, and multimodal processing.

**When to use this skill:**
- Need Gemini's multimodal capabilities (image/video analysis)
- Need DeepSeek's advanced reasoning for complex code analysis
- Need Grok's real-time data and research capabilities
- Want to leverage multiple AI perspectives on a problem
- Comparing different AI approaches to a task

## Available AI Models

### 1. Google Gemini
**Strengths:**
- Multimodal analysis (images, video, audio)
- Long context window (2M tokens)
- Strong reasoning and planning
- Real-time information access

**Use cases:**
- Image/video analysis
- Document analysis with visual elements
- Complex planning tasks
- Multimodal reasoning

### 2. DeepSeek
**Strengths:**
- Advanced code reasoning
- Mathematical problem solving
- Deep analysis and explanation
- Cost-effective for large tasks

**Use cases:**
- Complex code analysis
- Algorithm optimization
- Mathematical modeling
- Technical deep dives

### 3. Grok (xAI)
**Strengths:**
- Real-time web access
- Research and fact-checking
- Current events and trends
- Creative problem solving

**Use cases:**
- Web research
- Current information gathering
- Trend analysis
- Creative brainstorming

## How to Invoke

### Method 1: Using Agent Scripts

```bash
# Gemini Agent
python3 orchestrator/gemini_agent.py "Analyze this architecture diagram and suggest improvements"

# DeepSeek Agent
python3 orchestrator/deepseek_agent.py "Optimize this sorting algorithm for better performance"

# Grok Agent
python3 orchestrator/grok_agent.py "Research the latest developments in multi-agent AI systems"
```

### Method 2: Using Hybrid Orchestrator

```python
from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5
import asyncio

async def multi_ai_task():
    orchestrator = HybridOrchestratorV5()

    # Let orchestrator choose best AI
    result = await orchestrator.execute_task(
        task_description="Your task here",
        agent_preference="gemini"  # or "deepseek", "grok"
    )

    return result

asyncio.run(multi_ai_task())
```

### Method 3: Direct API Invocation

```python
# Gemini
from orchestrator.gemini_agent import GeminiAgent
agent = GeminiAgent()
result = agent.execute("Your prompt")

# DeepSeek
from orchestrator.deepseek_agent import DeepSeekAgent
agent = DeepSeekAgent()
result = agent.execute("Your prompt")

# Grok
from orchestrator.grok_agent import GrokAgent
agent = GrokAgent()
result = agent.execute("Your prompt")
```

## Best Practices

### 1. Choose the Right AI for the Task

**Use Gemini when:**
- Task involves images, PDFs, or multimodal content
- Need long context (analyzing large documents)
- Require real-time information
- Complex planning and reasoning

**Use DeepSeek when:**
- Deep code analysis required
- Mathematical or algorithmic problems
- Need detailed technical explanations
- Cost is a concern for large tasks

**Use Grok when:**
- Need current web information
- Research and fact-checking
- Creative or unconventional approaches
- Real-time data analysis

### 2. Combine Multiple AI Perspectives

```python
# Example: Get multiple perspectives
async def multi_perspective_analysis(question):
    orchestrator = HybridOrchestratorV5()

    # Get Gemini's view
    gemini_result = await orchestrator.execute_task(
        task_description=question,
        agent_preference="gemini"
    )

    # Get DeepSeek's view
    deepseek_result = await orchestrator.execute_task(
        task_description=question,
        agent_preference="deepseek"
    )

    # Synthesize results
    return {
        "gemini": gemini_result,
        "deepseek": deepseek_result,
        "synthesis": "Combined insights..."
    }
```

### 3. Save Results to Obsidian Vault

```python
from orchestrator.obsidian_manager import ObsidianManager

# After getting AI results
obsidian = ObsidianManager()
obsidian.save_agent_result(
    agent_name="gemini",
    task_description="Task description",
    result=result,
    tags=["ai-analysis", "planning"]
)
```

## Configuration

### Environment Variables

```bash
# Required API keys
export GOOGLE_API_KEY="your-gemini-key"
export DEEPSEEK_API_KEY="your-deepseek-key"
export XAI_API_KEY="your-grok-key"
```

### Agent Configuration

Check and modify agent configurations:
```bash
# View agent configurations
cat orchestrator/gemini_agent.py
cat orchestrator/deepseek_agent.py
cat orchestrator/grok_agent.py
```

## Examples

### Example 1: Multimodal Analysis with Gemini

```python
# Analyze an architecture diagram
from orchestrator.gemini_agent import GeminiAgent

agent = GeminiAgent()
result = agent.execute_with_image(
    prompt="Analyze this system architecture and identify bottlenecks",
    image_path="diagrams/architecture.png"
)
```

### Example 2: Code Optimization with DeepSeek

```python
# Optimize complex algorithm
from orchestrator.deepseek_agent import DeepSeekAgent

agent = DeepSeekAgent()
result = agent.execute("""
Analyze this sorting algorithm and suggest optimizations:

def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

Focus on:
1. Time complexity improvements
2. Memory optimization
3. Edge case handling
""")
```

### Example 3: Research with Grok

```python
# Research current trends
from orchestrator.grok_agent import GrokAgent

agent = GrokAgent()
result = agent.execute("""
Research the latest developments in:
1. Multi-agent AI orchestration
2. Real-time streaming architectures
3. LangGraph and agent frameworks

Provide:
- Recent papers and articles
- Key trends and innovations
- Best practices emerging in 2025
""")
```

## Integration with Workflow

### Automatic Agent Selection

The hybrid orchestrator can automatically choose the best AI:

```python
# Orchestrator analyzes task and picks optimal AI
result = await orchestrator.execute_task(
    task_description="Analyze this PDF report and create a summary",
    # Orchestrator will likely choose Gemini for PDF analysis
)
```

### Task-Based Routing

```python
# Define routing rules
AGENT_ROUTING = {
    "image_analysis": "gemini",
    "code_optimization": "deepseek",
    "web_research": "grok",
    "general_planning": "claude"
}
```

## Monitoring and Logging

### View AI Agent Activity

```bash
# Monitor in web UI
http://localhost:3000/agents

# Check logs
tail -f web-ui/dev.log | grep -E "(gemini|deepseek|grok)"

# View agent results in Obsidian
ls -la obsidian-vault/Agents/
```

### Track Token Usage and Costs

```python
# After task execution
print(f"Agent: {result['agent']}")
print(f"Tokens used: {result['tokens']}")
print(f"Cost estimate: ${result['cost']}")
print(f"Execution time: {result['duration']}s")
```

## Error Handling

```python
try:
    result = await orchestrator.execute_task(
        task_description="Your task",
        agent_preference="gemini"
    )
except Exception as e:
    # Fallback to another agent
    result = await orchestrator.execute_task(
        task_description="Your task",
        agent_preference="deepseek"
    )
```

## Resources

- **Documentation**: See `MULTI_AI_RESEARCH.md` for detailed info
- **Architecture**: See `V5_ARCHITECTURE.md` for system design
- **Agent Code**: Check `orchestrator/*_agent.py` files
- **Test Scripts**: Run `test_multi_ai_research.py` for examples
