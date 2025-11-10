# Comprehensive Orchestration System Exploration Report

**Generated:** 2025-11-08  
**Purpose:** Identify existing functionality before implementing multi-AI planning layer enhancements  
**Scope:** Backend (Python orchestrator) + Frontend (Next.js web-ui)

---

## Executive Summary

This report catalogs **existing implementations** vs **missing functionality** across:
1. Multi-AI Integration Patterns
2. Event Emission for Planning
3. Frontend Node Spawning & UI Components
4. Testing Infrastructure
5. Configuration & Error Handling

**Key Findings:**
- ✅ **Multi-AI infrastructure EXISTS** (`multi_ai_research.py`, individual AI agents)
- ⚠️ **Planning layer EXISTS but NOT integrated** with hybrid orchestrator V4
- ❌ **Event emission for planning nodes DOES NOT EXIST**
- ✅ **Frontend supports dynamic node spawning** but hardcoded planning nodes
- ⚠️ **Terminal tabs (Input/Thinking/Output) EXIST** but metadata capture incomplete
- ❌ **Modal components for node details DO NOT EXIST**

---

## 1. Backend Exploration: Multi-AI Integration

### 1.1 Multi-AI Research Module ✅ EXISTS

**File:** `/orchestrator/multi_ai_research.py` (568 lines)

**Capabilities:**
- ✅ Parallel querying of multiple AI providers (OpenAI, Grok, Claude CLI, DeepSeek, Perplexity, Gemini)
- ✅ Response aggregation and synthesis
- ✅ Consensus/divergence analysis
- ✅ Source compilation

**Key Functions:**
```python
class MultiAIResearch:
    async def research_topic(topic, providers, synthesize=True)
    async def _query_provider(provider, model, topic, context)
    async def _query_openai(model, prompt)
    async def _query_grok(model, prompt)
    async def _query_claude(model, prompt)  # Uses Claude Code CLI
    async def _query_deepseek(model, prompt)
    async def _query_gemini(model, prompt)  # NotImplemented - needs google-generativeai
    async def _synthesize_responses(topic, responses)
```

**API Key Detection:**
```python
self.openai_key = os.getenv("OPENAI_API_KEY")
self.grok_key = os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY")
self.deepseek_key = os.getenv("DEEPSEEK_API_KEY")
self.gemini_key = os.getenv("GEMINI_API_KEY")
self.perplexity_key = os.getenv("PERPLEXITY_API_KEY")
```

**Import Detection:**
```bash
# Files importing multi_ai_research:
orchestrator/unified_orchestrator.py
orchestrator/hybrid_planner.py
orchestrator/hybrid_orchestrator_v5.py
orchestrator/archive/hybrid_orchestrator_v4_iterative.py
orchestrator/archive/run_hybrid_task_v5.py
orchestrator/archive/hybrid_orchestrator_v5.py
```

**Status:** ⚠️ **EXISTS but NOT used in active orchestrator**

---

### 1.2 Individual AI Agents ✅ EXIST

#### DeepSeek Agent
**File:** `/orchestrator/deepseek_agent.py`

```python
class DeepSeekAgent:
    """Cost-efficient AI for plan enrichment and code generation"""
    
    async def enrich_plan(request: PlanEnrichmentRequest) -> PlanEnrichmentResult
    async def generate_code(request: CodeGenerationRequest) -> CodeGenerationResult
```

**Capabilities:**
- Plan enrichment with technical insights
- Code generation (alternative to Codex)
- Risk analysis
- Suggestion generation

**API:** OpenAI-compatible (`base_url="https://api.deepseek.com"`)

---

#### Grok Agent
**File:** `/orchestrator/grok_agent.py`

```python
class GrokAgent:
    """xAI's Grok for creative insights and pattern recognition"""
    
    async def review_plan(request: PlanReviewRequest) -> PlanReviewResult
    async def get_creative_insights(request: CreativeInsightsRequest) -> CreativeInsightsResult
```

**Capabilities:**
- Plan review and validation
- Creative alternative approaches
- Pattern recognition
- Risk identification with unconventional thinking

**API:** OpenAI-compatible (`base_url="https://api.x.ai/v1"`)

---

#### Gemini Agent
**File:** `/orchestrator/gemini_agent.py`

```python
class GeminiAgent:
    """Google Gemini for documentation and final review"""
    
    async def generate_documentation(request: DocumentationRequest) -> DocumentationResult
    async def final_review(request: ReviewRequest) -> ReviewResult
```

**Capabilities:**
- Generate comprehensive documentation
- Create README files
- Final quality assessment
- Overall project quality scoring

**API:** Requires `google.generativeai` package

---

### 1.3 Hybrid Planner ✅ EXISTS (Sequential Multi-AI Pipeline)

**File:** `/orchestrator/hybrid_planner.py` (200+ lines)

**Workflow:**
```
Claude Plan → Best Practices Injection → ChatGPT → DeepSeek → Grok → Gemini
```

**Implementation:**
```python
class HybridPlanner:
    """Multi-AI sequential enrichment pipeline"""
    
    async def enrich_plan(
        task_title,
        task_description, 
        claude_plan,
        context
    ) -> EnrichedPlan
```

**Each AI receives:**
- Full conversation history from previous AIs
- Cumulative enrichments
- Original task context

**Status:** ⚠️ **EXISTS but NOT integrated** with `hybrid_orchestrator_v4_iterative.py`

---

### 1.4 ChatGPT Planner ✅ EXISTS

**File:** `/orchestrator/chatgpt_planner.py` (538 lines)

**Current Implementation:**
```python
class ChatGPTPlanner:
    async def create_plan(user_goal, context) -> ExecutionPlan
    async def refine_plan(plan, feedback) -> ExecutionPlan
    async def summarize_results(plan, results) -> str
```

**Advanced Reasoning Support:**
```python
# Supports two-step planning with advanced models
reasoning_model: Optional[str] = None  # e.g., "gpt-5", "o3", "o3-mini"

# Step 1: Advanced reasoning model creates plan
# Step 2: gpt-4o formats plan as JSON
```

**Usage in V4 Orchestrator:**
- Line 119: `self.chatgpt = ChatGPTPlanner(...)`
- Line 265: `execution_plan = await self.chatgpt.create_plan(user_goal, context)`

**Status:** ✅ **ACTIVE in V4 orchestrator** but single-AI only

---

## 2. Event Emission for Planning

### 2.1 Redis Event Publisher ✅ EXISTS

**File:** `/orchestrator/redis_publisher.py` (409 lines)

**Event Structure:**
```python
def _prepare_event_payload(event: Dict[str, Any]) -> Dict[str, Any]:
    payload["event_type"] = event_type
    payload["timestamp"] = datetime.now().isoformat()
    payload["source_app"] = source_app
    payload["task_id"] = task_id
    payload["session_id"] = session_id
    payload["data"] = {...}  # Structured metadata
```

**Available Event Methods:**
```python
class RedisEventPublisher:
    publish_orchestrator_start(user_request)
    publish_planning_complete(task_id, plan)
    publish_task_decomposed(task_id, num_tasks, strategy)
    publish_manager_started(task_id, manager_name, num_subtasks)
    publish_manager_complete(task_id, manager_name, success)
    publish_agent_spawned(task_id, agent_id, agent_type)
    publish_agent_complete(task_id, agent_id, agent_type, success, duration)
    publish_validation_start(task_id)
    publish_validation_complete(task_id, alignment_score, passed)
    publish_orchestrator_complete(task_id, success, duration, artifacts)
    publish_error(task_id, error_message, actor, error_details)
```

**Async Helper:**
```python
async def publish_event(event: Dict[str, Any], channel: Optional[str] = None) -> None
```

---

### 2.2 Planning Layer Module ✅ EXISTS

**File:** `/orchestrator/planning_layer.py` (541 lines)

**Purpose:** Pre-ChatGPT architectural analysis

```python
class PlanningLayer:
    def analyze_request(title, description) -> ArchitecturalPlan
    def _identify_patterns(title, description) -> List[str]
    def _add_web_app_components(plan, description)
    def _add_social_components(plan, description)
    def _add_auth_components(plan, description)
    def _add_realtime_components(plan, description)
```

**Patterns Detected:**
- Web application
- Social features
- Authentication
- Real-time features
- API
- Data-intensive

**Status:** ⚠️ **EXISTS but NOT used** in current orchestrator flow

---

### 2.3 Planning Events ❌ DO NOT EXIST

**Search Results:**
```bash
# Searched for: ai_enrichment_request, ai_enrichment_response, planning_agent, planning_node
# Found in: redis_publisher.py, task_decomposer.py, planning_layer.py, hierarchical_agent.py

# redis_publisher.py has:
publish_planning_complete(task_id, plan)  # Generic planning event

# BUT MISSING:
- ai_enrichment_request events
- ai_enrichment_response events  
- Individual planning agent spawn events
- Planning node metadata (input/thinking/output)
```

**Frontend Expectations (from `OrchestratorCanvas.tsx`):**
```typescript
// Line 101-104: Frontend LISTENS for these events
const isEnrichmentRequest = hook_event_type === 'ai_enrichment_request' || 
                             (event as any).type === 'ai_enrichment_request' ||
                             payload?.type === 'ai_enrichment_request';

// Line 128-131: Frontend LISTENS for response events
const isEnrichmentResponse = hook_event_type === 'ai_enrichment_response' || 
                              (event as any).type === 'ai_enrichment_response' ||
                              payload?.type === 'ai_enrichment_response';
```

**Conclusion:** ❌ **Backend does NOT emit these events** that frontend expects

---

## 3. Orchestrator Stages Analysis

### 3.1 Hybrid Orchestrator V4 Iterative ✅ ACTIVE

**File:** `/orchestrator/hybrid_orchestrator_v4_iterative.py` (1243 lines)

**Current Stages:**
```python
# Stage 1: Claude Initial Analysis (lines 192-232)
analysis_stage = DialogueStage(
    stage_id="stage-1-analysis",
    stage_type="analysis",
    claude_action="Analyze goal and identify information needs"
)

# Stage 2: ChatGPT Creates Execution Plan (lines 244-294)
planning_stage = DialogueStage(
    stage_id="stage-2-planning", 
    stage_type="planning",
    claude_action="Waiting for ChatGPT to create execution plan"
)

# Stage 3: Iterative Execution Loop (lines 299-432)
exec_stage = DialogueStage(
    stage_id=f"stage-3-exec-turn-{current_turn}",
    stage_type="execution",
    claude_action=f"Execute work (turn {current_turn})"
)

# Stage 3.5: AR Code Review (lines 434-475)
review_stage = DialogueStage(
    stage_id="stage-3.5-review",
    stage_type="review", 
    claude_action="Review implementation against plan"
)

# Stage 4: Final Summary (lines 477-523)
summary_stage = DialogueStage(
    stage_id="stage-4-summary",
    stage_type="summary",
    claude_action="Generate final summary"
)
```

**Agent Activity Callbacks:**
```python
# Lines 209-231: PP agent activity
await agent_activity_callback("PP", "spawn", ...)
await agent_activity_callback("PP", "status", "running", {...})
await agent_activity_callback("PP", "output", ...)
await agent_activity_callback("PP", "complete", ...)

# Lines 259-272: CHATGPT agent activity
await agent_activity_callback("CHATGPT", "spawn", ...)
await agent_activity_callback("CHATGPT", "status", "thinking", {...})
await agent_activity_callback("CHATGPT", "output", ...)
await agent_activity_callback("CHATGPT", "complete", ...)

# Lines 338-407: IM agent activity (execution)
# Lines 453-473: AR agent activity (review)
# Lines 497-515: RD agent activity (summary)
```

**Status:** ✅ **Stage 0 does NOT exist** - planning is Stage 2

---

### 3.2 Multi-AI Planning Integration ❌ DOES NOT EXIST

**Current Flow:**
```
User Goal → PP Analysis → ChatGPT Planning → IM Execution → AR Review → RD Summary
```

**Proposed Flow (NOT IMPLEMENTED):**
```
User Goal → PP Analysis → Stage 0: Multi-AI Planning Layer
                              ↓
            planning-claude, planning-chatgpt, planning-deepseek, planning-grok, planning-gemini
                              ↓
          → IM Execution → AR Review → RD Summary
```

**What's Missing:**
1. ❌ Stage 0 orchestration logic
2. ❌ Sequential AI calling in planning phase
3. ❌ Event emission for each planning AI
4. ❌ Metadata capture (input/thinking/output) for each AI
5. ❌ Aggregation of planning results

---

## 4. Frontend Exploration

### 4.1 Dynamic Node Spawning ✅ EXISTS

**File:** `/web-ui/components/orchestrator/OrchestratorCanvas.tsx`

**Hardcoded Planning Nodes (Initialization):**
```typescript
// MISSING: Initialization code not visible in lines 1-300
// But frontend LISTENS for planning events (lines 101-174)
```

**Dynamic Agent Spawning (Lines 189-293):**
```typescript
if (hook_event_type === 'agent_spawned' || hook_event_type === 'agent_started') {
  const agentId = payload.agent_id || payload.session_id || source_app;
  const parentId = payload.parent_agent_id || payload.parent_id || 'orchestrator-root';
  const agentType = payload.agent || payload.agent_type || payload.type || source_app;

  // Calculate position with dynamic spacing
  const childIndex = parent.children.length;
  const baseHorizontalSpacing = Math.max(15, 100 / (siblingCount + 3));
  const verticalSpacing = 12;
  
  const newAgent: Agent = {
    id: agentId,
    name: agentType,
    type: agentType,
    status: 'spawning',
    parentId: actualParentId,
    x: newX,
    y: newY,
    children: [],
    depth: nodeDepth,
    layer: 'agent',
    metadata: {},
  };
}
```

**Planning Node Updates (Lines 100-174):**
```typescript
// Enrichment request (AI starts thinking)
if (isEnrichmentRequest) {
  const aiName = payload?.ai_name || payload?.aiName || payload?.ai || 'Unknown';
  const planningNodeId = `planning-${aiName?.toLowerCase()}`;
  
  setAgents(prev => ({
    ...prev,
    [planningNodeId]: {
      ...prev[planningNodeId],
      status: 'planning',  // Update status to planning
    },
  }));
}

// Enrichment response (AI completes)
if (isEnrichmentResponse) {
  const responseData = payload?.response_data || payload?.responseData || ...;
  
  const metadata = {
    ...prev[planningNodeId].metadata,
    thoughts: responseData || prev[planningNodeId].metadata?.thoughts,
    content: responseData || prev[planningNodeId].metadata?.content,
  };

  setAgents(prev => ({
    ...prev,
    [planningNodeId]: {
      ...prev[planningNodeId],
      status: payload?.success !== false ? 'active' : 'error',
      metadata,
    },
  }));
}
```

**Conclusion:**
- ✅ Frontend CAN handle dynamic nodes
- ⚠️ Frontend EXPECTS planning nodes to exist (hardcoded IDs like `planning-claude`)
- ❌ Backend does NOT emit planning events frontend expects

---

### 4.2 Terminal Panel Tabs ✅ EXIST

**File:** `/web-ui/components/orchestrator/SplitViewTerminal.tsx`

**Tab Types:**
```typescript
type TabType = 'logs' | 'thoughts' | 'code' | 'output';

const tabs = [
  { id: 'logs', label: 'Logs', icon: Terminal, count: logs.length },
  { id: 'thoughts', label: 'Thoughts', icon: Lightbulb },
  { id: 'code', label: 'Code', icon: Code },
  { id: 'output', label: 'Output', icon: FileText },
];
```

**Content Extraction:**
```typescript
// Thoughts (lines 86-115)
const thoughtsContent = useMemo(() => {
  // Check metadata first
  if (nodeMetadata?.thoughts) return nodeMetadata.thoughts;
  if (nodeMetadata?.content) return nodeMetadata.content;
  
  // Extract from logs (filters for planning/thinking messages)
  const thoughtsLogs = logs.filter(log => 
    role === 'planning' || message.includes('thinking') || ...
  );
}, [logs, nodeMetadata]);

// Code (lines 49-83)
const codeContent = useMemo(() => {
  if (nodeMetadata?.code) return nodeMetadata.code;
  
  // Extract code blocks from logs
  const codeBlockRegex = /```[\s\S]*?```/g;
  const matches = message.match(codeBlockRegex);
}, [logs, nodeMetadata]);

// Output (lines 117-148)
const outputContent = useMemo(() => {
  if (nodeMetadata?.output) return nodeMetadata.output;
  
  const outputLogs = logs.filter(log =>
    type === 'output' || message.includes('result') || ...
  );
}, [logs, nodeMetadata]);
```

**Status:** ✅ **Tabs EXIST** but metadata population is **incomplete**

---

### 4.3 Node Click Handlers ✅ EXIST

**File:** `/web-ui/app/page.tsx`

**Main Handler (Lines 89-106):**
```typescript
const handleNodeClick = useCallback((agentId: string) => {
  setSelectedAgent(agentId);
  
  const isPlanningNode = agentId.startsWith('planning-');
  const isCodeAgent = agentId.includes('code') || agentId.includes('IM') || ...;
  const isWebProject = agentId.includes('web') || agentId.includes('html') || ...;
  
  // Show code panel for code-writing agents
  if (isCodeAgent || isPlanningNode || codeFiles.length > 0) {
    setShowCodePanel(true);
  }
  
  // Show browser preview for web projects
  if (isWebProject) {
    setShowBrowserPreview(true);
  }
}, [codeFiles]);
```

**Error Handling:**
```typescript
// ✅ Has try-catch in various operations
// ✅ Handles missing nodes gracefully
// Lines 226-230 in OrchestratorCanvas:
if (!parent) {
  console.warn('❌ Parent agent not found:', actualParentId);
  return prev;
}
```

**Status:** ✅ **Handlers EXIST** with proper error handling

---

### 4.4 Modal Components ❌ DO NOT EXIST (for Agent Details)

**Search Results:**
```bash
# Found: NewProjectModal.tsx
# NOT FOUND: AgentDetailModal, AgentInfoModal, NodeDetailModal
```

**NewProjectModal Usage:**
```typescript
// Only modal found is for project creation, not agent details
web-ui/components/orchestrator/NewProjectModal.tsx
```

**Conclusion:** ❌ **No modal for displaying agent details** when clicking nodes

---

## 5. Testing Exploration

### 5.1 Existing Playwright Tests ✅ EXIST

**Directory:** `/web-ui/tests/`

```
tests/
├── e2e/                          # End-to-end tests
├── event-publishing.spec.ts      # Event publishing tests (5714 bytes)
├── integration/                  # Integration tests
├── live-agent-monitoring.spec.ts # Live monitoring tests (9237 bytes)
├── unit/                         # Unit tests
└── websocket-hook.test.tsx       # WebSocket tests (7483 bytes)
```

**Playwright Config:**
```typescript
// playwright.config.ts
baseURL: 'http://127.0.0.1:3002'
timeout: 60_000
headless: true
trace: 'on-first-retry'
```

**Status:** ✅ **Test infrastructure EXISTS**

---

### 5.2 Orchestration-Related Tests ⚠️ INCOMPLETE

**Existing Tests:**
- ✅ Event publishing
- ✅ Live agent monitoring
- ✅ WebSocket hook

**Missing Tests:**
- ❌ Planning layer multi-AI workflow
- ❌ Planning node visualization
- ❌ Input/Thinking/Output metadata capture
- ❌ Ghost node rendering (unavailable AI)
- ❌ Sequential AI calling

---

## 6. Configuration & Error Handling

### 6.1 API Key Management ✅ EXISTS

**Environment Variables Checked:**
```python
# multi_ai_research.py
OPENAI_API_KEY
GROK_API_KEY or XAI_API_KEY
DEEPSEEK_API_KEY
GEMINI_API_KEY
PERPLEXITY_API_KEY

# Individual agents
deepseek_agent.py: DEEPSEEK_API_KEY
grok_agent.py: GROK_API_KEY or XAI_API_KEY
gemini_agent.py: GEMINI_API_KEY
```

**Validation Logic:**
```python
class MultiAIResearch:
    def _get_available_providers(self) -> List[str]:
        available = []
        if self.openai_client: available.append("openai")
        if self.grok_client: available.append("grok")
        if self.claude_cli_available: available.append("claude")
        if self.deepseek_client: available.append("deepseek")
        if self.perplexity_client: available.append("perplexity")
        if self.gemini_client: available.append("gemini")
        return available
    
    def get_provider_status(self) -> Dict[str, bool]:
        return {
            "openai": self.openai_client is not None,
            "grok": self.grok_client is not None,
            ...
        }
```

**Status:** ✅ **API key detection EXISTS**

---

### 6.2 Missing Key Fallback Handling ⚠️ INCOMPLETE

**Current Behavior:**
```python
# HybridPlanner (hybrid_planner.py lines 110-148)
try:
    self.chatgpt = ChatGPTPlanner(...)
    self._log("✓ ChatGPT planner initialized")
except Exception as e:
    self._log(f"✗ ChatGPT initialization failed: {e}")
    self.chatgpt = None  # Sets to None but doesn't skip in pipeline

# DeepSeek, Grok, Gemini follow same pattern
```

**Problem:**
- ❌ Pipeline does NOT gracefully skip unavailable AIs
- ❌ No "ghost node" rendering for missing AIs
- ❌ No user notification of which AIs are unavailable

**Status:** ⚠️ **Partial fallback** but no UI indication

---

### 6.3 Ghost Nodes / Unavailable States ❌ DO NOT EXIST

**Search Results:**
```bash
# Searched for: unavailable, offline, disabled, ghost, placeholder
# Found in various components but NO agent status badges
```

**Frontend Agent Interface:**
```typescript
// OrchestratorCanvas.tsx
interface Agent {
  status: 'spawning' | 'planning' | 'active' | 'complete' | 'idle' | 'error';
  // NO: 'unavailable' | 'offline' | 'disabled'
}
```

**Conclusion:** ❌ **No ghost node rendering** for missing AI providers

---

## 7. Critical Files Summary

### Backend Core Files

| File | Lines | Status | Purpose |
|------|-------|--------|---------|
| `multi_ai_research.py` | 568 | ✅ Exists | Multi-AI parallel querying & synthesis |
| `hybrid_planner.py` | 200+ | ⚠️ Exists, Not Integrated | Sequential multi-AI enrichment pipeline |
| `chatgpt_planner.py` | 538 | ✅ Active | ChatGPT execution planning |
| `deepseek_agent.py` | 100+ | ✅ Exists | DeepSeek plan enrichment & code gen |
| `grok_agent.py` | 100+ | ✅ Exists | Grok creative review & insights |
| `gemini_agent.py` | 100+ | ✅ Exists | Gemini documentation & final review |
| `redis_publisher.py` | 409 | ✅ Active | Event publishing to Redis |
| `planning_layer.py` | 541 | ⚠️ Exists, Not Used | Pre-ChatGPT architectural analysis |
| `hybrid_orchestrator_v4_iterative.py` | 1243 | ✅ Active | Main orchestrator (Stages 1-4) |

### Frontend Core Files

| File | Lines | Status | Purpose |
|------|-------|--------|---------|
| `OrchestratorCanvas.tsx` | 300+ | ✅ Active | Node visualization & event handling |
| `SplitViewTerminal.tsx` | 200+ | ✅ Active | Terminal panel with tabs |
| `page.tsx` | 200+ | ✅ Active | Main page with node click handlers |
| `AgentNode.tsx` | ? | ✅ Active | Individual agent node rendering |
| `BranchingConnector.tsx` | ? | ✅ Active | Connection lines between nodes |

---

## 8. Recommendations by Phase

### Phase 1: Backend Multi-AI Planning Layer

**What EXISTS:**
- ✅ `hybrid_planner.py` with full sequential pipeline
- ✅ Individual AI agent classes (DeepSeek, Grok, Gemini)
- ✅ `multi_ai_research.py` for parallel queries

**What DOES NOT EXIST:**
- ❌ Integration of `HybridPlanner` into `hybrid_orchestrator_v4_iterative.py`
- ❌ Stage 0 orchestration logic
- ❌ Event emission for planning phase
- ❌ Metadata capture (input/thinking/output) per AI

**Recommendation:**
1. **Integrate `HybridPlanner`** into orchestrator V4 as Stage 0
2. **Emit events** for each AI in sequence:
   ```python
   # Before each AI call
   await publish_event({
       "type": "ai_enrichment_request",
       "ai_name": "claude",  # or "chatgpt", "deepseek", "grok", "gemini"
       "request_data": {...}
   })
   
   # After each AI response
   await publish_event({
       "type": "ai_enrichment_response",
       "ai_name": "claude",
       "response_data": {...},
       "success": True
   })
   ```
3. **Capture metadata** for each AI's contribution
4. **Handle missing APIs** gracefully

---

### Phase 2: Frontend Planning Node Visualization

**What EXISTS:**
- ✅ Event listeners for `ai_enrichment_request/response`
- ✅ Planning node update logic
- ✅ Dynamic node spawning infrastructure

**What DOES NOT EXIST:**
- ❌ Initial planning node creation logic
- ❌ Ghost node rendering for unavailable AIs

**Recommendation:**
1. **Initialize planning nodes** in OrchestratorCanvas:
   ```typescript
   const PLANNING_AIS = ['claude', 'chatgpt', 'deepseek', 'grok', 'gemini'];
   
   // Create planning nodes on orchestrator start
   PLANNING_AIS.forEach((ai, idx) => {
     const planningNodeId = `planning-${ai}`;
     setAgents(prev => ({
       ...prev,
       [planningNodeId]: {
         id: planningNodeId,
         name: ai,
         type: 'planning',
         status: 'idle',  // or 'unavailable' if API key missing
         parentId: 'orchestrator-root',
         x: 50,
         y: 15 + (idx * 5),
         children: [],
         layer: 'planning',
         metadata: {},
       },
     }));
   });
   ```
2. **Toggle visibility** of planning nodes based on user preference
3. **Render ghost nodes** with badge indicators for unavailable AIs

---

### Phase 3: Terminal Panel Metadata Enhancement

**What EXISTS:**
- ✅ Terminal tabs (Logs, Thoughts, Code, Output)
- ✅ Metadata extraction from logs

**What DOES NOT EXIST:**
- ❌ Direct metadata population from backend events
- ❌ Structured Input/Thinking/Output capture

**Recommendation:**
1. **Backend: Include metadata in events**:
   ```python
   await publish_event({
       "type": "ai_enrichment_response",
       "ai_name": "deepseek",
       "response_data": {
           "input": original_request,
           "thinking": reasoning_process,
           "output": final_enrichment
       }
   })
   ```
2. **Frontend: Update node metadata from events**:
   ```typescript
   if (isEnrichmentResponse) {
     const metadata = {
       input: payload.response_data?.input,
       thoughts: payload.response_data?.thinking,
       output: payload.response_data?.output,
     };
     
     setNodeMetadata(prev => ({
       ...prev,
       [planningNodeId]: metadata,
     }));
   }
   ```

---

### Phase 4: Modal for Node Details

**What EXISTS:**
- ❌ Nothing - no modal component exists

**Recommendation:**
1. **Create `AgentDetailModal.tsx`**:
   ```typescript
   interface AgentDetailModalProps {
     agentId: string;
     agent: Agent;
     logs: LogEntry[];
     metadata: NodeMetadata;
     onClose: () => void;
   }
   ```
2. **Display:**
   - Agent name, type, status
   - Input/Thinking/Output tabs
   - Logs history
   - Code generated (if applicable)
   - Execution timeline
3. **Trigger:** Click on planning nodes (not just agent nodes)

---

### Phase 5: Testing & Error Handling

**What EXISTS:**
- ✅ Playwright test infrastructure
- ✅ Event publishing tests
- ✅ WebSocket tests

**What DOES NOT EXIST:**
- ❌ Planning layer workflow tests
- ❌ Multi-AI sequence tests
- ❌ Ghost node tests

**Recommendation:**
1. **Create test suite**:
   ```typescript
   // tests/multi-ai-planning.spec.ts
   test('Planning layer spawns all AI nodes', async ({ page }) => {
     // Submit task
     // Verify planning-claude, planning-chatgpt, etc. appear
   });
   
   test('Ghost nodes appear for missing API keys', async ({ page }) => {
     // Mock missing DEEPSEEK_API_KEY
     // Verify planning-deepseek has "unavailable" badge
   });
   
   test('Sequential AI calls emit events in order', async ({ page }) => {
     // Submit task
     // Verify events: claude → chatgpt → deepseek → grok → gemini
   });
   ```
2. **Integration tests** for error handling
3. **E2E tests** for full planning → execution flow

---

## 9. Implementation Checklist

### ✅ What You DON'T Need to Build

- ✅ Multi-AI research module (exists)
- ✅ Individual AI agents (DeepSeek, Grok, Gemini exist)
- ✅ HybridPlanner sequential pipeline (exists)
- ✅ Redis event publisher (exists)
- ✅ Frontend node spawning logic (exists)
- ✅ Terminal panel tabs (exists)
- ✅ Test infrastructure (exists)

### ❌ What You NEED to Build

**Backend:**
1. ❌ Stage 0 integration in `hybrid_orchestrator_v4_iterative.py`
2. ❌ Event emission for planning phase (`ai_enrichment_request/response`)
3. ❌ Metadata capture (input/thinking/output) for each AI
4. ❌ Graceful skipping of unavailable AIs
5. ❌ API key availability endpoint for frontend

**Frontend:**
6. ❌ Planning node initialization logic
7. ❌ Ghost node rendering (unavailable badge)
8. ❌ Planning node toggle (show/hide)
9. ❌ AgentDetailModal component
10. ❌ Direct metadata population from events

**Testing:**
11. ❌ Multi-AI planning workflow tests
12. ❌ Ghost node rendering tests
13. ❌ Sequential AI calling tests

---

## 10. File Paths Reference

**Backend Files:**
```
/orchestrator/multi_ai_research.py
/orchestrator/hybrid_planner.py
/orchestrator/chatgpt_planner.py
/orchestrator/deepseek_agent.py
/orchestrator/grok_agent.py
/orchestrator/gemini_agent.py
/orchestrator/redis_publisher.py
/orchestrator/planning_layer.py
/orchestrator/hybrid_orchestrator_v4_iterative.py
/orchestrator/claude_cli_executor.py
```

**Frontend Files:**
```
/web-ui/components/orchestrator/OrchestratorCanvas.tsx
/web-ui/components/orchestrator/SplitViewTerminal.tsx
/web-ui/components/orchestrator/AgentNode.tsx
/web-ui/components/orchestrator/BranchingConnector.tsx
/web-ui/components/orchestrator/NewProjectModal.tsx
/web-ui/app/page.tsx
/web-ui/lib/useWebSocket.ts
```

**Test Files:**
```
/web-ui/tests/event-publishing.spec.ts
/web-ui/tests/live-agent-monitoring.spec.ts
/web-ui/tests/websocket-hook.test.tsx
/web-ui/playwright.config.ts
```

---

## 11. Next Steps

**Recommended Order:**
1. **Backend Stage 0 Integration** (use existing `HybridPlanner`)
2. **Event Emission** (add planning events to orchestrator)
3. **Frontend Planning Nodes** (initialize on orchestrator start)
4. **Metadata Capture** (backend → frontend event flow)
5. **Ghost Nodes** (unavailable AI indicators)
6. **AgentDetailModal** (detailed node view)
7. **Testing** (multi-AI workflow tests)

**Dependencies:**
- Backend Stage 0 → Event Emission → Frontend Visualization
- Metadata Capture → Terminal Panel Enhancement
- All above → Testing

---

**Report Complete** ✅
