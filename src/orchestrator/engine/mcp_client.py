"""
MCP Client for agent-tool interactions.
Handles connection, tool discovery, and privacy-preserving operations.

Aligned with Anthropic's MCP Best Practices (Nov 2024):
- Progressive tool loading
- Context-efficient operations
- Privacy-preserving PII tokenization
- Cost tracking
"""
from typing import Dict, List, Optional, Any
import json
import hashlib
import re
import os
from dataclasses import dataclass, field
from enum import Enum


@dataclass
class MCPServerConfig:
    """Configuration for MCP server connection"""
    name: str
    endpoint: str
    provider: str  # e.g., 'anthropic', 'openai', 'google'
    auth_token: Optional[str] = None
    capabilities: List[str] = field(default_factory=list)
    cost_per_1k_tokens: float = 0.001


class DetailLevel(Enum):
    """Tool discovery detail levels for progressive disclosure"""
    NAME = 'name'
    NAME_DESC = 'name-desc'
    FULL_SCHEMA = 'full-schema'


class AgentMCPClient:
    """
    Enhanced MCP client with progressive tool loading,
    PII tokenization, and cost tracking.

    Features:
    - Connect to multiple MCP servers (AI providers)
    - Progressive tool discovery (name → desc → full schema)
    - Privacy-preserving PII tokenization
    - Cost tracking per server/tool
    - Retry logic with exponential backoff
    """

    def __init__(self, servers: List[MCPServerConfig]):
        self.servers: Dict[str, MCPServerConfig] = {}
        self.connections: Dict[str, Any] = {}
        self.tool_cache: Dict[str, Dict] = {}
        self.pii_lookup: Dict[str, str] = {}
        self.call_metrics = {
            'total_calls': 0,
            'tokens_used': 0,
            'cost': 0.0,
            'by_server': {}
        }
        self._connect_servers(servers)

    def _connect_servers(self, servers: List[MCPServerConfig]):
        """Establish connections to all MCP servers"""
        for server_config in servers:
            try:
                # In production, this would establish actual MCP connections
                # For now, we simulate with config storage
                self.servers[server_config.name] = server_config
                self.connections[server_config.name] = {
                    'status': 'connected',
                    'endpoint': server_config.endpoint
                }
                self.call_metrics['by_server'][server_config.name] = {
                    'calls': 0,
                    'tokens': 0,
                    'cost': 0.0
                }
                print(f"✓ Connected to {server_config.name} ({server_config.provider})")
            except Exception as e:
                print(f"✗ Failed to connect to {server_config.name}: {e}")

    def call_tool(
        self,
        server: str,
        tool: str,
        params: Dict[str, Any],
        privacy_mode: bool = False,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Execute tool call via MCP without passing through model context.

        This is the core of MCP efficiency: Direct tool execution
        without loading schemas into model context.

        Args:
            server: MCP server name (e.g., 'claude', 'chatgpt')
            tool: Tool name (e.g., 'orchestrate', 'generate_code')
            params: Tool parameters
            privacy_mode: Whether to tokenize PII in params
            max_retries: Max retry attempts on failure

        Returns:
            Tool execution result with metadata

        Raises:
            ValueError: If server not connected
            RuntimeError: If all retries fail
        """
        if server not in self.servers:
            raise ValueError(f"Server '{server}' not connected. Available: {list(self.servers.keys())}")

        # Privacy tokenization if enabled
        if privacy_mode:
            params = self.tokenize_pii(params)

        # Execute via MCP (simulated for now)
        tool_id = f"{server}__{tool}"

        for attempt in range(max_retries):
            try:
                # In production, this would call actual MCP protocol
                # For now, we simulate the call structure
                result = self._simulate_mcp_call(server, tool, params)

                # Track metrics
                self.call_metrics['total_calls'] += 1
                tokens_used = result.get('tokens_used', 0)
                self.call_metrics['tokens_used'] += tokens_used

                server_config = self.servers[server]
                cost = (tokens_used / 1000) * server_config.cost_per_1k_tokens
                self.call_metrics['cost'] += cost

                # Track per-server metrics
                self.call_metrics['by_server'][server]['calls'] += 1
                self.call_metrics['by_server'][server]['tokens'] += tokens_used
                self.call_metrics['by_server'][server]['cost'] += cost

                result['cost'] = cost
                return result

            except Exception as e:
                if attempt == max_retries - 1:
                    raise RuntimeError(f"MCP call failed after {max_retries} attempts: {e}")
                # Exponential backoff
                import time
                time.sleep(2 ** attempt)

    def _simulate_mcp_call(self, server: str, tool: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simulate MCP call for development.
        In production, replace with actual MCP protocol client.
        """
        # This would be replaced with actual API calls
        return {
            'success': True,
            'server': server,
            'tool': tool,
            'result': f"Simulated result from {server}.{tool}",
            'tokens_used': 100,  # Placeholder
            'params': params
        }

    def search_tools(
        self,
        query: str,
        detail_level: DetailLevel = DetailLevel.NAME_DESC
    ) -> List[Dict[str, Any]]:
        """
        Progressive tool discovery without loading full schemas.

        This is key for token efficiency: Load only what's needed.

        Detail levels:
        - NAME: Just tool names (minimal tokens)
        - NAME_DESC: Names + descriptions (moderate tokens)
        - FULL_SCHEMA: Complete parameter schemas (full tokens)

        Args:
            query: Search query (e.g., 'planning', 'security', 'code review')
            detail_level: How much detail to return

        Returns:
            List of matching tools with requested detail level

        Example:
            >>> client.search_tools('planning', DetailLevel.NAME)
            [{'server': 'chatgpt', 'name': 'create_plan'}]

            >>> client.search_tools('planning', DetailLevel.FULL_SCHEMA)
            [{'server': 'chatgpt', 'name': 'create_plan',
              'description': 'Generate structured plan',
              'parameters': {...}}]
        """
        results = []

        # Simulated tool registry (in production, query actual MCP servers)
        tool_registry = self._get_tool_registry()

        for server_name, tools in tool_registry.items():
            for tool in tools:
                # Simple keyword matching
                if query.lower() in tool['name'].lower() or query.lower() in tool.get('description', '').lower():
                    result = {
                        'server': server_name,
                        'name': tool['name']
                    }

                    if detail_level in [DetailLevel.NAME_DESC, DetailLevel.FULL_SCHEMA]:
                        result['description'] = tool.get('description', '')

                    if detail_level == DetailLevel.FULL_SCHEMA:
                        result['parameters'] = tool.get('parameters', {})
                        result['returns'] = tool.get('returns', {})

                    results.append(result)

        return results

    def _get_tool_registry(self) -> Dict[str, List[Dict]]:
        """Get tool registry from all connected servers"""
        # In production, this would query actual MCP servers
        # For now, return simulated registry
        return {
            'claude': [
                {
                    'name': 'orchestrate',
                    'description': 'Orchestrate multi-step workflows',
                    'parameters': {'task': 'str', 'context': 'dict'}
                },
                {
                    'name': 'review_code',
                    'description': 'Review code for quality and security',
                    'parameters': {'code': 'str', 'language': 'str'}
                }
            ],
            'chatgpt': [
                {
                    'name': 'create_plan',
                    'description': 'Generate structured execution plan',
                    'parameters': {'task': 'str', 'constraints': 'dict'}
                },
                {
                    'name': 'evaluate_confidence',
                    'description': 'Evaluate task confidence score',
                    'parameters': {'task': 'str', 'responses': 'dict'}
                }
            ],
            'codex': [
                {
                    'name': 'generate_code',
                    'description': 'Generate code from specifications',
                    'parameters': {'spec': 'str', 'language': 'str'}
                },
                {
                    'name': 'refine_code',
                    'description': 'Refine and optimize existing code',
                    'parameters': {'code': 'str', 'feedback': 'str'}
                }
            ]
        }

    def tokenize_pii(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Replace PII with tokens, store lookup for de-tokenization.

        Detects and tokenizes:
        - Email addresses
        - SSNs (Social Security Numbers)
        - Credit card numbers
        - Phone numbers
        - API keys

        Args:
            data: Dictionary potentially containing PII

        Returns:
            Tokenized dictionary with PII replaced by [TOKEN_N] placeholders

        Example:
            >>> data = {'email': 'user@example.com', 'name': 'John'}
            >>> tokenized = client.tokenize_pii(data)
            >>> print(tokenized)
            {'email': '[EMAIL_0]', 'name': 'John'}
        """
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
            elif re.match(r'^\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}$', value):
                token = f"CC_{len(self.pii_lookup)}"
                self.pii_lookup[token] = value
                tokenized[key] = f"[{token}]"

            # Phone number detection
            elif re.match(r'^\+?1?\d{9,15}$', value):
                token = f"PHONE_{len(self.pii_lookup)}"
                self.pii_lookup[token] = value
                tokenized[key] = f"[{token}]"

            # API key detection (common patterns)
            elif re.match(r'^(sk|pk)_[a-zA-Z0-9]{32,}$', value):
                token = f"APIKEY_{len(self.pii_lookup)}"
                self.pii_lookup[token] = value
                tokenized[key] = f"[{token}]"

            else:
                tokenized[key] = value

        return tokenized

    def detokenize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Restore original PII from tokenized data.

        Args:
            data: Tokenized dictionary

        Returns:
            Original dictionary with PII restored
        """
        detokenized = {}

        for key, value in data.items():
            if isinstance(value, str) and value.startswith('[') and value.endswith(']'):
                token = value[1:-1]
                detokenized[key] = self.pii_lookup.get(token, value)
            elif isinstance(value, dict):
                detokenized[key] = self.detokenize(value)
            else:
                detokenized[key] = value

        return detokenized

    def get_metrics(self) -> Dict[str, Any]:
        """
        Return current usage metrics.

        Returns:
            Dictionary with:
            - total_calls: Total MCP calls made
            - tokens_used: Total tokens consumed
            - cost: Total cost in USD
            - by_server: Per-server breakdown
            - servers_connected: Number of connected servers
            - tools_cached: Number of cached tool definitions
            - pii_tokens: Number of PII tokens stored
        """
        return {
            **self.call_metrics,
            'servers_connected': len(self.servers),
            'tools_cached': len(self.tool_cache),
            'pii_tokens': len(self.pii_lookup),
            'efficiency': {
                'avg_tokens_per_call': (
                    self.call_metrics['tokens_used'] / self.call_metrics['total_calls']
                    if self.call_metrics['total_calls'] > 0 else 0
                ),
                'avg_cost_per_call': (
                    self.call_metrics['cost'] / self.call_metrics['total_calls']
                    if self.call_metrics['total_calls'] > 0 else 0
                )
            }
        }

    def reset_metrics(self):
        """Reset all metrics counters"""
        self.call_metrics = {
            'total_calls': 0,
            'tokens_used': 0,
            'cost': 0.0,
            'by_server': {
                server: {'calls': 0, 'tokens': 0, 'cost': 0.0}
                for server in self.servers
            }
        }

    def disconnect_all(self):
        """Close all MCP server connections"""
        for server_name in list(self.connections.keys()):
            self.connections[server_name]['status'] = 'disconnected'
            print(f"✓ Disconnected from {server_name}")


# Example usage and factory function
def create_default_mcp_client() -> AgentMCPClient:
    """
    Create MCP client with default server configurations.

    Reads API keys from environment variables.
    """
    servers = [
        MCPServerConfig(
            name='claude',
            endpoint='https://api.anthropic.com/v1/mcp',
            provider='anthropic',
            auth_token=os.getenv('ANTHROPIC_API_KEY'),
            capabilities=['orchestration', 'code_review', 'planning'],
            cost_per_1k_tokens=0.015  # Claude Sonnet pricing
        ),
        MCPServerConfig(
            name='chatgpt',
            endpoint='https://api.openai.com/v1/mcp',
            provider='openai',
            auth_token=os.getenv('OPENAI_API_KEY'),
            capabilities=['planning', 'qa', 'refinement'],
            cost_per_1k_tokens=0.01  # GPT-4 pricing
        ),
        MCPServerConfig(
            name='codex',
            endpoint='https://api.openai.com/v1/mcp/codex',
            provider='openai',
            auth_token=os.getenv('OPENAI_API_KEY'),
            capabilities=['code_generation', 'code_refinement'],
            cost_per_1k_tokens=0.002  # Codex pricing
        ),
        MCPServerConfig(
            name='deepseek',
            endpoint='https://api.deepseek.com/v1/mcp',
            provider='deepseek',
            auth_token=os.getenv('DEEPSEEK_API_KEY'),
            capabilities=['analysis', 'optimization'],
            cost_per_1k_tokens=0.001  # DeepSeek pricing
        ),
        MCPServerConfig(
            name='gemini',
            endpoint='https://generativelanguage.googleapis.com/v1/mcp',
            provider='google',
            auth_token=os.getenv('GOOGLE_API_KEY'),
            capabilities=['documentation', 'translation'],
            cost_per_1k_tokens=0.0005  # Gemini pricing
        ),
        MCPServerConfig(
            name='grok',
            endpoint='https://api.x.ai/v1/mcp',
            provider='xai',
            auth_token=os.getenv('XAI_API_KEY'),
            capabilities=['creative_review', 'alternatives'],
            cost_per_1k_tokens=0.003  # Grok pricing
        ),
    ]

    return AgentMCPClient(servers)
