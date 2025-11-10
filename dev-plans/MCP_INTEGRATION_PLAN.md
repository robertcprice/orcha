# Super Thorough Orchestration Upgrade Plan Aligned with Anthropic's MCP Best Practices

**Version:** 1.0
**Date:** 2025-11-09
**Estimated Duration:** 15-25 days
**Status:** Planning Phase

## Executive Summary

This comprehensive plan represents a complete evolution of the Multi-AI Orchestration Platform, transitioning from direct API calls to a Model Context Protocol (MCP) based architecture. The upgrade aligns with Anthropic's best practices released November 2024, focusing on:

- **Code execution-centric approach** over direct tool calls
- **Progressive tool loading** to reduce context window bloat
- **Token efficiency** improvements of 90-98% (150k → 2k tokens)
- **Filesystem-based tool discovery** for dynamic agent capabilities
- **Privacy-preserving operations** with PII tokenization
- **DAG-based orchestration** with confidence-driven gates

## Core Principles & Alignment with Anthropic MCP Guidelines

### 1. Avoid Direct Tool Calls
**Current State:** Direct API calls consume context for each definition/result.
**New State:** Agents write code to interact with MCP servers, loading tools progressively.

### 2. Code Execution for Efficiency
**Implementation:** Secure sandboxed Python REPL where agents generate and run code.
**Benefit:** Handle loops, filtering, and data transforms outside model context.
**Token Reduction:** 90-98% (per Anthropic examples)

### 3. Filesystem-Based Tool Discovery
**Structure:** Tools exposed as file tree (`./mcp_servers/{provider}/{tool}.py`)
**Discovery:** Agents explore via filesystem operations, loading only needed definitions.

### 4. Progressive Disclosure
**Mechanism:** `search_tools` function with detail levels (name-only, desc, full-schema)
**Benefit:** Query MCP servers without upfront loading of all schemas.

### 5. Context-Efficient Results
**Strategy:** Filter large outputs in code before returning to model.
**Example:** Summarize code reviews, transcripts, logs before model ingestion.

### 6. Powerful Control Flow
**Approach:** Use code for loops/conditionals instead of model-chained calls.
**Example:** Retry logic, iterative refinement, test generation loops.

### 7. Privacy-Preserving Operations
**Method:** Tokenize PII via MCP client intercepts.
**Storage:** Maintain lookup tables for de-tokenization.

### 8. State Persistence & Skills
**Files:** Persist intermediates to workspace files.
**Skills:** Build reusable code + SKILL.md documentation.

---

## Architecture Overview

### Current 6-Phase Pipeline
```
User Task → Multi-AI Enrichment → Execution → Review → Refinement → Documentation → Result
```

### New 11-Node DAG Pipeline
```
P0: Intake --> P1: Planning --> S1: Sec-Plan
                          |               |
                          v               v
                       P2: Impl <-- T1: Tests
                          |           ^
                          v           |
                       S2: Sec-Review --> S3: Sec-Fix --> P4: Refine (loop <=5x)
                                                     |
                                                     v
                                                  D1: Docs --> O1: Final-Ops --> P6: Persist
```

### Token Efficiency Gains
| Component | Current | MCP-Based | Savings |
|-----------|---------|-----------|---------|
| Planning Phase | 40k tokens | 2k tokens | 95% |
| Implementation | 60k tokens | 5k tokens | 92% |
| Review | 30k tokens | 1.5k tokens | 95% |
| Documentation | 25k tokens | 2k tokens | 92% |
| **Total** | **155k tokens** | **10.5k tokens** | **93%** |

---

## Detailed Directory Restructure

### New Backend Structure
```
src/
├── orchestrator/
│   ├── engine/                       # Core orchestration engine
│   │   ├── __init__.py
│   │   ├── dag.py                    # DAG construction & execution
│   │   ├── state.py                  # State management with ReflexionMemory
│   │   ├── gates.py                  # Confidence gates & rubrics
│   │   ├── dialogue.py               # Interactive Q&A system
│   │   ├── mcp_client.py             # NEW: MCP protocol client
│   │   ├── code_exec.py              # NEW: Sandboxed code execution
│   │   ├── tool_tree.py              # NEW: Filesystem tool discovery
│   │   └── telemetry.py              # Cost tracking & monitoring
│   │
│   ├── nodes/                        # DAG node implementations
│   │   ├── __init__.py
│   │   ├── p0_intake.py              # Interactive intake & budgeting
│   │   ├── p1_planning.py            # Multi-AI planning committee
│   │   ├── s1_security_plan.py       # Security planning & threat modeling
│   │   ├── p2_implementation.py      # Code generation
│   │   ├── t1_testing.py             # Test generation & execution
│   │   ├── s2_security_review.py     # Security scanning & review
│   │   ├── s3_security_fix.py        # Vulnerability patching
│   │   ├── p4_refinement.py          # Iterative refinement
│   │   ├── d1_documentation.py       # Documentation generation
│   │   ├── o1_final_ops.py           # E2E testing & validation
│   │   └── p6_persist.py             # State persistence
│   │
│   ├── agents/                       # MCP-enabled AI agents
│   │   ├── __init__.py
│   │   ├── base_agent.py             # Abstract MCP agent base
│   │   ├── claude_agent.py           # Claude via MCP
│   │   ├── chatgpt_agent.py          # ChatGPT via MCP
│   │   ├── codex_agent.py            # Codex via MCP
│   │   ├── deepseek_agent.py         # DeepSeek via MCP
│   │   ├── grok_agent.py             # Grok via MCP
│   │   └── gemini_agent.py           # Gemini via MCP
│   │
│   ├── security/                     # Security subsystem
│   │   ├── __init__.py
│   │   ├── stride.py                 # STRIDE threat modeling
│   │   ├── semgrep_mcp.py            # Semgrep MCP integration
│   │   ├── sbom_generator.py         # Software Bill of Materials
│   │   ├── privacy.py                # PII tokenization
│   │   └── vault.py                  # Secret management
│   │
│   ├── skills/                       # Reusable code skills
│   │   ├── data_processing/
│   │   │   ├── SKILL.md
│   │   │   └── transform.py
│   │   ├── test_generation/
│   │   │   ├── SKILL.md
│   │   │   └── generator.py
│   │   └── documentation/
│   │       ├── SKILL.md
│   │       └── builder.py
│   │
│   └── unified_orchestrator_v2.py    # NEW: MCP-based orchestrator
│
├── mcp_servers/                      # Auto-generated tool tree
│   ├── claude/
│   │   ├── orchestrate.py
│   │   ├── review_code.py
│   │   └── finalize_plan.py
│   ├── chatgpt/
│   │   ├── planner.py
│   │   ├── evaluate_confidence.py
│   │   └── generate_questions.py
│   ├── codex/
│   │   ├── generate_code.py
│   │   └── refine.py
│   ├── deepseek/
│   │   ├── contribute_plan.py
│   │   └── enumerate_threats.py
│   ├── grok/
│   │   └── creative_review.py
│   ├── gemini/
│   │   ├── generate_docs.py
│   │   └── translate.py
│   └── semgrep/
│       └── scan.py
│
├── api/                              # Enhanced REST API
│   ├── __init__.py
│   ├── main.py                       # FastAPI app with MCP endpoints
│   ├── auth.py                       # JWT authentication
│   ├── database.py                   # SQLAlchemy + job storage
│   ├── models.py                     # Enhanced models
│   ├── schemas.py                    # Pydantic schemas
│   ├── config.py                     # Settings
│   └── routers/
│       ├── auth.py                   # Authentication routes
│       ├── users.py                  # User management
│       ├── jobs.py                   # NEW: Job orchestration
│       ├── mcp.py                    # NEW: MCP server management
│       ├── nodes.py                  # NEW: Node execution
│       └── telemetry.py              # NEW: Metrics & monitoring
│
└── workspace/                        # Code execution workspace
    ├── .gitkeep
    └── README.md
```

### New Frontend Structure
```
web-ui/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Dashboard home
│   ├── jobs/
│   │   ├── page.tsx                  # Jobs list
│   │   ├── [id]/
│   │   │   ├── page.tsx              # Job detail
│   │   │   └── dag/page.tsx          # DAG visualization
│   │   └── new/page.tsx              # Job creation
│   ├── nodes/
│   │   ├── page.tsx                  # Node explorer
│   │   └── [id]/page.tsx             # Node detail
│   ├── agents/
│   │   ├── page.tsx                  # Agent status
│   │   └── [id]/page.tsx             # Agent detail
│   ├── security/
│   │   ├── page.tsx                  # Security dashboard
│   │   ├── threats/page.tsx          # Threat inventory
│   │   └── scans/page.tsx            # Scan results
│   ├── mcp/
│   │   ├── page.tsx                  # MCP server manager
│   │   └── tools/page.tsx            # Tool explorer
│   └── api/
│       ├── jobs/route.ts
│       ├── nodes/route.ts
│       ├── mcp/route.ts
│       └── telemetry/route.ts
│
├── components/
│   ├── dag/
│   │   ├── DAGVisualizer.tsx         # Interactive DAG
│   │   ├── NodeCard.tsx              # Node status card
│   │   └── EdgeConnector.tsx         # DAG edges
│   ├── code/
│   │   ├── CodeEditor.tsx            # Monaco editor
│   │   ├── ExecutionLog.tsx          # Code execution logs
│   │   └── DiffViewer.tsx            # Code diffs
│   ├── security/
│   │   ├── ThreatMatrix.tsx          # STRIDE matrix
│   │   ├── FindingCard.tsx           # Security finding
│   │   └── SBOMViewer.tsx            # SBOM display
│   ├── telemetry/
│   │   ├── CostTracker.tsx           # Cost metrics
│   │   ├── TokenChart.tsx            # Token usage
│   │   └── LatencyGraph.tsx          # Performance graphs
│   └── mcp/
│       ├── ServerStatus.tsx          # MCP server health
│       ├── ToolTree.tsx              # Tool filesystem
│       └── ToolSearch.tsx            # Tool discovery UI
│
├── lib/
│   ├── api-client.ts                 # API wrapper
│   ├── mcp-client.ts                 # MCP WebSocket client
│   ├── dag-utils.ts                  # DAG utilities
│   └── telemetry-utils.ts            # Metrics helpers
│
└── types/
    ├── job.ts
    ├── node.ts
    ├── agent.ts
    ├── mcp.ts
    └── security.ts
```

---

## Implementation Details

### Phase 1: Core MCP Infrastructure (Days 1-3, 24 hours)

#### 1.1 MCP Client Implementation
**File:** `src/orchestrator/engine/mcp_client.py` (~200 LOC)

```python
"""
MCP Client for agent-tool interactions.
Handles connection, tool discovery, and privacy-preserving operations.
"""
from typing import Dict, List, Optional, Any
import json
import hashlib
from mcp_sdk import MCPClient, MCPServer
from dataclasses import dataclass

@dataclass
class MCPServerConfig:
    name: str
    endpoint: str
    auth_token: Optional[str] = None
    capabilities: List[str] = None

class AgentMCPClient(MCPClient):
    """
    Enhanced MCP client with progressive tool loading,
    PII tokenization, and cost tracking.
    """

    def __init__(self, servers: List[MCPServerConfig]):
        super().__init__()
        self.servers = {}
        self.tool_cache = {}
        self.pii_lookup = {}
        self.call_metrics = {
            'total_calls': 0,
            'tokens_used': 0,
            'cost': 0.0
        }
        self._connect_servers(servers)

    def _connect_servers(self, servers: List[MCPServerConfig]):
        """Establish connections to all MCP servers"""
        for server_config in servers:
            try:
                server = MCPServer(
                    name=server_config.name,
                    endpoint=server_config.endpoint,
                    auth_token=server_config.auth_token
                )
                self.servers[server_config.name] = server
                print(f"✓ Connected to {server_config.name}")
            except Exception as e:
                print(f"✗ Failed to connect to {server_config.name}: {e}")

    def call_tool(
        self,
        server: str,
        tool: str,
        params: Dict[str, Any],
        privacy_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Execute tool call via MCP without passing through model context.

        Args:
            server: MCP server name (e.g., 'claude', 'chatgpt')
            tool: Tool name (e.g., 'orchestrate', 'generate_code')
            params: Tool parameters
            privacy_mode: Whether to tokenize PII in params

        Returns:
            Tool execution result with metadata
        """
        if server not in self.servers:
            raise ValueError(f"Server '{server}' not connected")

        # Privacy tokenization if enabled
        if privacy_mode:
            params = self.tokenize_pii(params)

        # Execute via MCP
        tool_id = f"{server}__{tool}"
        result = self.invoke(tool_id, params)

        # Track metrics
        self.call_metrics['total_calls'] += 1
        self.call_metrics['tokens_used'] += result.get('tokens_used', 0)
        self.call_metrics['cost'] += result.get('cost', 0.0)

        return result

    def search_tools(
        self,
        query: str,
        detail_level: str = 'name-desc'
    ) -> List[Dict[str, Any]]:
        """
        Progressive tool discovery without loading full schemas.

        Detail levels:
        - 'name': Just tool names
        - 'name-desc': Names + descriptions
        - 'full-schema': Complete parameter schemas

        Args:
            query: Search query (e.g., 'planning', 'security')
            detail_level: How much detail to return

        Returns:
            List of matching tools with requested detail level
        """
        results = []

        for server_name, server in self.servers.items():
            tools = server.query_tools(query)

            for tool in tools:
                result = {'server': server_name, 'name': tool['name']}

                if detail_level in ['name-desc', 'full-schema']:
                    result['description'] = tool.get('description', '')

                if detail_level == 'full-schema':
                    result['parameters'] = tool.get('parameters', {})
                    result['returns'] = tool.get('returns', {})

                results.append(result)

        return results

    def tokenize_pii(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Replace PII with tokens, store lookup for de-tokenization.

        Detects: emails, SSNs, credit cards, phone numbers

        Args:
            data: Dictionary potentially containing PII

        Returns:
            Tokenized dictionary with PII replaced
        """
        import re

        tokenized = {}

        for key, value in data.items():
            if not isinstance(value, str):
                tokenized[key] = value
                continue

            # Email detection
            if re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', value):
                token = f"EMAIL_{len(self.pii_lookup)}"
                self.pii_lookup[token] = value
                tokenized[key] = f"[{token}]"

            # SSN detection
            elif re.match(r'^\d{3}-\d{2}-\d{4}$', value):
                token = f"SSN_{len(self.pii_lookup)}"
                self.pii_lookup[token] = value
                tokenized[key] = f"[{token}]"

            # Credit card detection
            elif re.match(r'^\d{4}-\d{4}-\d{4}-\d{4}$', value):
                token = f"CC_{len(self.pii_lookup)}"
                self.pii_lookup[token] = value
                tokenized[key] = f"[{token}]"

            else:
                tokenized[key] = value

        return tokenized

    def detokenize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Restore original PII from tokenized data"""
        detokenized = {}

        for key, value in data.items():
            if isinstance(value, str) and value.startswith('[') and value.endswith(']'):
                token = value[1:-1]
                detokenized[key] = self.pii_lookup.get(token, value)
            else:
                detokenized[key] = value

        return detokenized

    def get_metrics(self) -> Dict[str, Any]:
        """Return current usage metrics"""
        return {
            **self.call_metrics,
            'servers_connected': len(self.servers),
            'tools_cached': len(self.tool_cache),
            'pii_tokens': len(self.pii_lookup)
        }
```

**Tests:**
- Connection to mock MCP servers
- Tool search with different detail levels
- PII tokenization/detokenization
- Metrics tracking

**Timeline:** 8 hours (Day 1)

---

#### 1.2 Sandboxed Code Execution
**File:** `src/orchestrator/engine/code_exec.py` (~150 LOC)

```python
"""
Secure code execution environment for agent-generated code.
Uses RestrictedPython for sandboxing and workspace isolation.
"""
from typing import Dict, Any, List
import os
import sys
import json
from pathlib import Path
from restrictedpython import compile_restricted, safe_globals
from restrictedpython.Guards import guarded_iter_unpack_sequence

class CodeExecutor:
    """
    Sandboxed Python execution environment.

    Features:
    - Restricted builtins (no file I/O, network, subprocess)
    - Workspace isolation
    - MCP client injection
    - Timeout protection
    - Result serialization
    """

    def __init__(
        self,
        workspace: str = './workspace',
        timeout: int = 60,
        max_memory: int = 512  # MB
    ):
        self.workspace = Path(workspace)
        self.workspace.mkdir(exist_ok=True, parents=True)
        self.timeout = timeout
        self.max_memory = max_memory * 1024 * 1024  # Convert to bytes

        # Setup safe globals
        self.safe_globals = {
            '__builtins__': safe_globals,
            '_iter_unpack_sequence_': guarded_iter_unpack_sequence,
            'json': json,
            'os': self._restricted_os(),
            'Path': Path,
        }

    def _restricted_os(self):
        """Provide restricted os module (only safe operations)"""
        class RestrictedOS:
            @staticmethod
            def listdir(path='.'):
                # Only allow listing workspace
                full_path = Path(self.workspace) / path
                if not str(full_path).startswith(str(self.workspace)):
                    raise PermissionError("Access outside workspace denied")
                return os.listdir(full_path)

            @staticmethod
            def path_exists(path):
                full_path = Path(self.workspace) / path
                return full_path.exists()

        return RestrictedOS()

    def exec_code(
        self,
        code: str,
        mcp_client: Any = None,
        imports: List[str] = None
    ) -> Dict[str, Any]:
        """
        Execute agent-generated code in sandbox.

        Args:
            code: Python code to execute
            mcp_client: Injected MCP client for tool access
            imports: Allowed imports (whitelist)

        Returns:
            Execution result with output, logs, errors
        """
        # Setup execution environment
        exec_env = self.safe_globals.copy()

        # Inject MCP client
        if mcp_client:
            exec_env['mcp'] = mcp_client

        # Process allowed imports
        if imports:
            for imp in imports:
                if imp in ['json', 're', 'datetime', 'math']:
                    exec(f"import {imp}", exec_env)

        # Compile with restrictions
        try:
            byte_code = compile_restricted(
                code,
                filename='<agent_code>',
                mode='exec'
            )

            if byte_code.errors:
                return {
                    'success': False,
                    'error': 'Compilation errors',
                    'details': byte_code.errors
                }

            # Execute with timeout
            import signal

            def timeout_handler(signum, frame):
                raise TimeoutError(f"Execution exceeded {self.timeout}s")

            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(self.timeout)

            try:
                exec(byte_code.code, exec_env)
                signal.alarm(0)  # Cancel timeout

                # Extract results
                result = exec_env.get('result', None)
                logs = exec_env.get('logs', [])

                return {
                    'success': True,
                    'output': result,
                    'logs': logs,
                    'workspace_files': list(self.workspace.glob('**/*'))
                }

            except TimeoutError as e:
                return {
                    'success': False,
                    'error': 'timeout',
                    'message': str(e)
                }

            except Exception as e:
                return {
                    'success': False,
                    'error': type(e).__name__,
                    'message': str(e),
                    'traceback': self._get_traceback()
                }

        except SyntaxError as e:
            return {
                'success': False,
                'error': 'syntax_error',
                'message': str(e)
            }

    def _get_traceback(self) -> str:
        """Get sanitized traceback"""
        import traceback
        return traceback.format_exc()

    def cleanup_workspace(self):
        """Remove all files from workspace"""
        import shutil
        if self.workspace.exists():
            shutil.rmtree(self.workspace)
            self.workspace.mkdir(exist_ok=True)
```

**Tests:**
- Safe code execution
- Timeout enforcement
- Workspace isolation
- MCP client injection
- Error handling

**Timeline:** 10 hours (Day 1-2)

---

#### 1.3 Tool Tree Generator
**File:** `src/orchestrator/engine/tool_tree.py` (~100 LOC)

```python
"""
Generates filesystem-based tool tree from MCP servers.
Enables agent exploration via standard file operations.
"""
from typing import Dict, Any
from pathlib import Path
import json

class ToolTreeGenerator:
    """
    Creates filesystem representation of MCP tools.

    Structure:
    ./mcp_servers/
      ├── claude/
      │   ├── orchestrate.py
      │   ├── review_code.py
      │   └── __index__.json
      ├── chatgpt/
      │   └── ...
      └── README.md
    """

    def __init__(self, output_dir: str = './mcp_servers'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True, parents=True)

    def generate_tree(self, mcp_client: Any):
        """
        Generate complete tool tree from MCP client.

        Args:
            mcp_client: Connected MCP client
        """
        servers = mcp_client.servers

        # Generate server directories
        for server_name, server in servers.items():
            server_dir = self.output_dir / server_name
            server_dir.mkdir(exist_ok=True)

            tools = server.list_tools()
            tool_index = []

            # Generate tool files
            for tool_name, tool_spec in tools.items():
                self._generate_tool_file(
                    server_dir,
                    server_name,
                    tool_name,
                    tool_spec
                )
                tool_index.append({
                    'name': tool_name,
                    'description': tool_spec.get('description', ''),
                    'file': f'{tool_name}.py'
                })

            # Generate index
            with open(server_dir / '__index__.json', 'w') as f:
                json.dump(tool_index, f, indent=2)

        # Generate root README
        self._generate_readme()

    def _generate_tool_file(
        self,
        server_dir: Path,
        server_name: str,
        tool_name: str,
        tool_spec: Dict[str, Any]
    ):
        """Generate individual tool Python file"""
        template = f'''"""
{tool_spec.get('description', 'No description')}

Server: {server_name}
Tool: {tool_name}
"""

def {tool_name}(mcp_client, **params):
    """
    {tool_spec.get('description', '')}

    Parameters:
    {self._format_params(tool_spec.get('parameters', {}))}

    Returns:
    {self._format_returns(tool_spec.get('returns', {}))}
    """
    return mcp_client.call_tool('{server_name}', '{tool_name}', params)


# Parameter schema
SCHEMA = {json.dumps(tool_spec.get('parameters', {}), indent=2)}

# Examples
EXAMPLES = {json.dumps(tool_spec.get('examples', []), indent=2)}
'''

        with open(server_dir / f'{tool_name}.py', 'w') as f:
            f.write(template)

    def _format_params(self, params: Dict[str, Any]) -> str:
        """Format parameter documentation"""
        if not params:
            return "    None"

        lines = []
        for name, spec in params.items():
            param_type = spec.get('type', 'any')
            description = spec.get('description', '')
            lines.append(f"    {name} ({param_type}): {description}")

        return '\n'.join(lines)

    def _format_returns(self, returns: Dict[str, Any]) -> str:
        """Format return documentation"""
        if not returns:
            return "    dict: Result dictionary"

        return f"    {returns.get('type', 'dict')}: {returns.get('description', '')}"

    def _generate_readme(self):
        """Generate root README for tool tree"""
        readme = '''# MCP Tool Tree

This directory contains auto-generated tool definitions from MCP servers.

## Structure

Each server has its own directory with:
- Individual tool files (.py)
- __index__.json (tool catalog)

## Usage in Agent Code

```python
# Import tools on-demand
from mcp_servers.claude.orchestrate import orchestrate
from mcp_servers.chatgpt.planner import planner

# Use with MCP client
result = orchestrate(mcp_client, task='Build calculator')
```

## Discovery

Agents can explore tools using filesystem operations:
```python
import os
servers = os.listdir('./mcp_servers')
claude_tools = os.listdir('./mcp_servers/claude')
```

## Regeneration

This tree is auto-generated. To regenerate:
```bash
python -m orchestrator.engine.tool_tree
```
'''

        with open(self.output_dir / 'README.md', 'w') as f:
            f.write(readme)
```

**Tests:**
- Tree generation from mock servers
- Tool file creation
- Index generation
- README creation

**Timeline:** 6 hours (Day 2)

---

### Phase 2: DAG-Based Orchestration (Days 4-7, 32 hours)

#### 2.1 DAG Engine
**File:** `src/orchestrator/engine/dag.py`

```python
"""
Directed Acyclic Graph orchestration engine.
Manages node execution, dependencies, and state transitions.
"""
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
import networkx as nx

class NodeStatus(Enum):
    PENDING = 'pending'
    RUNNING = 'running'
    COMPLETED = 'completed'
    FAILED = 'failed'
    SKIPPED = 'skipped'

@dataclass
class Node:
    """DAG node specification"""
    id: str
    name: str
    type: str  # e.g., 'planning', 'implementation', 'security'
    agent: str  # MCP server to use
    tool: str  # Tool within server
    inputs: List[str] = field(default_factory=list)
    outputs: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    gate: Optional[str] = None  # Confidence gate
    max_retries: int = 3
    timeout: int = 300  # seconds
    budget: Dict[str, int] = field(default_factory=dict)  # tokens, time

    # Runtime state
    status: NodeStatus = NodeStatus.PENDING
    attempts: int = 0
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class DAG:
    """
    Orchestration DAG with topological execution.

    Features:
    - Dependency resolution
    - Parallel execution where possible
    - Confidence gating
    - Retry logic
    - State persistence
    """

    def __init__(self, name: str):
        self.name = name
        self.graph = nx.DiGraph()
        self.nodes: Dict[str, Node] = {}

    def add_node(self, node: Node):
        """Add node to DAG"""
        self.nodes[node.id] = node
        self.graph.add_node(node.id, **node.__dict__)

    def add_edge(self, from_node: str, to_node: str):
        """Add dependency edge"""
        self.graph.add_edge(from_node, to_node)

    def get_execution_order(self) -> List[List[str]]:
        """
        Get topologically sorted execution order with parallelization.

        Returns list of batches, where each batch can execute in parallel.
        """
        try:
            topo_order = list(nx.topological_sort(self.graph))
        except nx.NetworkXError as e:
            raise ValueError(f"DAG contains cycle: {e}")

        # Group into parallel batches
        batches = []
        processed = set()

        while processed != set(topo_order):
            batch = []
            for node_id in topo_order:
                if node_id in processed:
                    continue

                # Check if all dependencies processed
                deps = list(self.graph.predecessors(node_id))
                if all(d in processed for d in deps):
                    batch.append(node_id)

            batches.append(batch)
            processed.update(batch)

        return batches

    def visualize(self) -> str:
        """Generate ASCII visualization"""
        import io
        from networkx.drawing.nx_pydot import write_dot

        # Simple text representation
        lines = [f"DAG: {self.name}"]
        lines.append("=" * 50)

        for batch_num, batch in enumerate(self.get_execution_order()):
            lines.append(f"\nBatch {batch_num + 1} (parallel):")
            for node_id in batch:
                node = self.nodes[node_id]
                lines.append(f"  - {node.name} ({node.status.value})")

        return '\n'.join(lines)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize DAG to dictionary"""
        return {
            'name': self.name,
            'nodes': {
                node_id: {
                    **node.__dict__,
                    'status': node.status.value
                }
                for node_id, node in self.nodes.items()
            },
            'edges': list(self.graph.edges())
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DAG':
        """Deserialize DAG from dictionary"""
        dag = cls(data['name'])

        for node_id, node_data in data['nodes'].items():
            node_data['status'] = NodeStatus(node_data['status'])
            node = Node(**node_data)
            dag.add_node(node)

        for from_id, to_id in data['edges']:
            dag.add_edge(from_id, to_id)

        return dag
```

**Tests:**
- DAG construction
- Topological sorting
- Parallel batch detection
- Cycle detection
- Serialization/deserialization

**Timeline:** 12 hours (Days 4-5)

---

(Continuing in next section due to length...)

## Node Implementation Examples

### P0: Interactive Intake
**File:** `src/orchestrator/nodes/p0_intake.py`

```python
"""
P0: Interactive Intake & Budgeting
Confidence-driven Q&A with user to refine task specification.
"""
from typing import Dict, Any, List

class IntakeNode:
    """
    Interactive task intake with confidence scoring.

    Process:
    1. Generate clarifying questions via ChatGPT
    2. Collect user responses
    3. Evaluate confidence (target ≥95%)
    4. Loop until confidence achieved or user satisfied
    5. Generate budgets and TASK.md
    """

    def execute(
        self,
        mcp_client: Any,
        code_executor: Any,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute intake node"""

        user_task = inputs.get('task', '')

        # Generate code for confidence-driven Q&A
        code = f'''
import json

# Initial task
task = {json.dumps(user_task)}
questions = []
responses = {{}}
confidence = 0
rounds = 0
max_rounds = 10

while confidence < 95 and rounds < max_rounds:
    # Generate questions via ChatGPT
    question_result = mcp.call_tool(
        'chatgpt',
        'generate_questions',
        {{
            'task': task,
            'previous_responses': responses,
            'target_confidence': 95
        }}
    )

    questions = question_result['questions']

    # Collect responses (simulated - real would use dialogue system)
    for q in questions:
        # In production, this would call dialogue.py for real-time user input
        resp = input(f"{{q}}\\n> ")
        responses[q] = resp

    # Evaluate confidence
    conf_result = mcp.call_tool(
        'chatgpt',
        'evaluate_confidence',
        {{
            'task': task,
            'responses': responses
        }}
    )

    confidence = conf_result['confidence_score']
    rounds += 1

    logs.append(f"Round {{rounds}}: Confidence = {{confidence}}%")

# Generate refined task
refined_result = mcp.call_tool(
    'chatgpt',
    'refine_task',
    {{
        'original_task': task,
        'qa_responses': responses,
        'confidence': confidence
    }}
)

# Generate budgets
budget_result = mcp.call_tool(
    'claude',
    'estimate_budgets',
    {{
        'task': refined_result['refined_task']
    }}
)

result = {{
    'refined_task': refined_result['refined_task'],
    'confidence': confidence,
    'budgets': budget_result['budgets'],
    'qa_transcript': responses,
    'rounds': rounds
}}
'''

        # Execute in sandbox
        exec_result = code_executor.exec_code(
            code,
            mcp_client=mcp_client,
            imports=['json']
        )

        if not exec_result['success']:
            return {
                'success': False,
                'error': exec_result['error']
            }

        return {
            'success': True,
            'outputs': exec_result['output'],
            'logs': exec_result['logs']
        }
```

---

### Security Node Example
**File:** `src/orchestrator/nodes/s1_security_plan.py`

```python
"""
S1: Security Planning & Threat Modeling
STRIDE-based threat analysis with mitigation planning.
"""

class SecurityPlanNode:
    """
    Generate comprehensive security plan using STRIDE methodology.
    """

    def execute(
        self,
        mcp_client: Any,
        code_executor: Any,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute security planning"""

        plan = inputs.get('plan', {})

        code = f'''
import json

plan = {json.dumps(plan)}

# Extract components from plan
components = mcp.call_tool(
    'claude',
    'extract_components',
    {{'plan': plan}}
)['components']

# STRIDE analysis per component
threats = []
stride_categories = ['Spoofing', 'Tampering', 'Repudiation', 'Information Disclosure', 'Denial of Service', 'Elevation of Privilege']

for component in components:
    for category in stride_categories:
        threat_result = mcp.call_tool(
            'deepseek',
            'enumerate_threats',
            {{
                'component': component,
                'category': category
            }}
        )

        for threat in threat_result['threats']:
            # Generate mitigations via Claude
            mitigation_result = mcp.call_tool(
                'claude',
                'generate_mitigations',
                {{
                    'threat': threat,
                    'component': component
                }}
            )

            threats.append({{
                'component': component['name'],
                'category': category,
                'threat': threat,
                'mitigations': mitigation_result['mitigations'],
                'severity': threat.get('severity', 'medium')
            }})

# Generate test matrix
test_matrix = mcp.call_tool(
    'claude',
    'create_security_test_matrix',
    {{'threats': threats}}
)

# Generate SEC_PLAN.md via Gemini
sec_plan_md = mcp.call_tool(
    'gemini',
    'format_security_plan',
    {{
        'threats': threats,
        'test_matrix': test_matrix,
        'components': components
    }}
)

result = {{
    'threats': threats,
    'test_matrix': test_matrix,
    'sec_plan_md': sec_plan_md['markdown'],
    'threat_count': len(threats)
}}
'''

        exec_result = code_executor.exec_code(
            code,
            mcp_client=mcp_client,
            imports=['json']
        )

        return {
            'success': exec_result['success'],
            'outputs': exec_result.get('output', {}),
            'logs': exec_result.get('logs', [])
        }
```

---

## Migration Timeline (15-25 Days)

### Week 1: Foundation
**Days 1-3:** Core MCP Infrastructure
- ✓ MCP client implementation
- ✓ Code executor with sandboxing
- ✓ Tool tree generator
- ✓ Unit tests for all core components

**Days 4-5:** DAG Engine
- ✓ DAG construction and validation
- ✓ Topological sorting with parallelization
- ✓ State management integration
- ✓ Visualization tools

**Days 6-7:** First 3 Nodes
- ✓ P0: Intake node
- ✓ P1: Planning node
- ✓ S1: Security planning node
- ✓ Integration tests

### Week 2: Node Implementation
**Days 8-10:** Core Implementation Nodes
- ✓ P2: Implementation node
- ✓ T1: Testing node
- ✓ P4: Refinement node

**Days 11-13:** Security Pipeline
- ✓ S2: Security review node
- ✓ S3: Security fix node
- ✓ Integration with Semgrep MCP

**Day 14:** Documentation & Ops Nodes
- ✓ D1: Documentation node
- ✓ O1: Final ops node
- ✓ P6: Persistence node

### Week 3: Integration & Testing
**Days 15-17:** REST API Enhancement
- ✓ MCP endpoint implementation
- ✓ Job orchestration API
- ✓ Telemetry and monitoring
- ✓ Authentication updates

**Days 18-20:** Frontend Restructure
- ✓ New Next.js architecture
- ✓ DAG visualizer component
- ✓ Real-time job monitoring
- ✓ Security dashboard

**Days 21-22:** End-to-End Testing
- ✓ Run 100+ test jobs
- ✓ Performance benchmarking
- ✓ Security audit
- ✓ Cost analysis

**Days 23-24:** Documentation
- ✓ API documentation
- ✓ Migration guide
- ✓ Operator runbook
- ✓ Architecture diagrams

**Day 25:** Community Sharing
- ✓ GitHub repository update
- ✓ MCP community forum post
- ✓ Blog post / case study
- ✓ Video walkthrough

---

## Key Performance Indicators (KPIs)

### Token Efficiency
- **Current:** 155k tokens/job
- **Target:** <10.5k tokens/job
- **Improvement:** 93% reduction

### Cost per Job
- **Current:** $0.25 average
- **Target:** $0.05 average
- **Improvement:** 80% reduction

### Execution Time
- **Current:** 180 seconds average
- **Target:** 90 seconds average (via parallelization)
- **Improvement:** 50% reduction

### Security Coverage
- **Threat Detection:** 98% of STRIDE categories
- **Vulnerability Remediation:** 95% success rate
- **False Positives:** <5%

### Quality Metrics
- **Confidence Score:** ≥95% on all gates
- **Test Coverage:** ≥80%
- **Code Quality:** 0 critical issues

---

## Risk Mitigation

### Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| MCP server failures | Medium | High | Retry logic, fallback agents, circuit breakers |
| Sandbox escapes | Low | Critical | RestrictedPython, resource limits, audit logging |
| Token budget overruns | Medium | Medium | Hard limits, downgrade modes, pre-flight checks |
| DAG cycles | Low | High | Validation on construction, unit tests |

### Operational Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Migration downtime | High | Medium | Phased rollout, feature flags, rollback plan |
| Data loss | Low | Critical | Backup before migration, state persistence |
| Training gap | Medium | Medium | Documentation, video tutorials, pair programming |

---

## Success Criteria

### Phase 1 Complete When:
- [ ] All MCP core components implemented and tested
- [ ] Tool tree generated from ≥3 MCP servers
- [ ] Code executor can run agent-generated code safely
- [ ] Token efficiency measured at ≥90% improvement

### Phase 2 Complete When:
- [ ] All 11 DAG nodes implemented
- [ ] End-to-end job completes successfully
- [ ] Confidence gates enforce ≥95% threshold
- [ ] Security pipeline catches test vulnerabilities

### Phase 3 Complete When:
- [ ] REST API supports full MCP workflow
- [ ] Frontend visualizes DAG in real-time
- [ ] 100 test jobs run with <5% failure rate
- [ ] Documentation complete and reviewed

### Final Success:
- [ ] Production deployment successful
- [ ] Community feedback collected
- [ ] Team trained on new architecture
- [ ] Migration artifacts shared publicly

---

## Appendices

### A. MCP Server Configurations
```yaml
servers:
  - name: claude
    endpoint: https://api.anthropic.com/v1/mcp
    auth_token: ${ANTHROPIC_API_KEY}
    capabilities:
      - orchestration
      - code_review
      - planning_finalization

  - name: chatgpt
    endpoint: https://api.openai.com/v1/mcp
    auth_token: ${OPENAI_API_KEY}
    capabilities:
      - planning
      - question_generation
      - confidence_evaluation

  - name: codex
    endpoint: https://api.openai.com/v1/mcp/codex
    auth_token: ${OPENAI_API_KEY}
    capabilities:
      - code_generation
      - code_refinement

  - name: semgrep
    endpoint: https://semgrep.dev/api/mcp
    auth_token: ${SEMGREP_TOKEN}
    capabilities:
      - security_scanning
      - vulnerability_detection
```

### B. Node Execution Budget Template
```yaml
node: P1-Planning
budget:
  tokens:
    max: 40000
    warning_threshold: 36000
  time:
    max_seconds: 300
    warning_threshold: 270
  cost:
    max_usd: 0.05
    warning_threshold: 0.045
  retries:
    max_attempts: 3
    backoff_multiplier: 2
```

### C. Confidence Rubric Example
```yaml
gate: PLAN
confidence_target: 95
sub_metrics:
  - name: Traceability
    weight: 20
    criteria:
      - All requirements mapped to implementation steps
      - Each step traceable to requirement
      - No orphaned steps

  - name: Testability
    weight: 20
    criteria:
      - Test strategy defined for each component
      - Acceptance criteria clear and measurable
      - Edge cases identified

  - name: Risk Coverage
    weight: 20
    criteria:
      - STRIDE analysis per component
      - Mitigations defined for each threat
      - Security test matrix complete

  - name: Cost Estimation
    weight: 20
    criteria:
      - Token budgets per phase
      - Time estimates per node
      - Cost projections per agent

  - name: Token Efficiency
    weight: 20
    criteria:
      - Tool definitions loaded < 5000 tokens
      - Progressive disclosure used
      - MCP calls optimized
```

---

## Conclusion

This comprehensive plan provides a roadmap for migrating to an MCP-based architecture aligned with Anthropic's best practices. The phased approach minimizes risk while delivering measurable improvements in efficiency, cost, and quality.

**Next Steps:**
1. Review and approve plan
2. Setup development environment
3. Begin Day 1: MCP infrastructure
4. Daily standups to track progress
5. Weekly demos to stakeholders

**Questions or Concerns:**
- Reach out to architecture team
- Consult MCP community forums
- Reference Anthropic documentation

**Document Version:** 1.0
**Last Updated:** 2025-11-09
**Owner:** Engineering Team
**Approvers:** [TBD]
