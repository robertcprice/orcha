#!/usr/bin/env python3
"""
Claude-Flow Memory Integration

Integrates Claude-Flow's AgentDB and ReasoningBank memory systems
with the Orchestration System for persistent, semantic memory across sessions.

Features:
- 96x-164x faster vector search vs Redis
- Semantic understanding with HNSW indexing
- Persistent memory across orchestration sessions
- Pattern learning from agent coordination history
- Hybrid AgentDB + ReasoningBank with automatic fallback
"""

import asyncio
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


@dataclass
class MemoryEntry:
    """Represents a memory entry in the system"""
    key: str
    content: str
    namespace: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    embedding: Optional[List[float]] = None


@dataclass
class SearchResult:
    """Result from semantic search"""
    key: str
    content: str
    similarity_score: float
    namespace: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = ""


class ClaudeFlowMemory:
    """
    Integration with Claude-Flow memory system (AgentDB + ReasoningBank).

    Provides persistent, semantic memory capabilities for the orchestration system
    with 96x-164x performance improvements over traditional storage.
    """

    def __init__(
        self,
        project_root: Path,
        default_namespace: str = "orchestration",
        use_reasoningbank: bool = True,
        verbose: bool = True
    ):
        """
        Initialize Claude-Flow memory integration.

        Args:
            project_root: Project root directory
            default_namespace: Default namespace for memory storage
            use_reasoningbank: Enable ReasoningBank for pattern matching
            verbose: Enable verbose logging
        """
        self.project_root = Path(project_root)
        self.default_namespace = default_namespace
        self.use_reasoningbank = use_reasoningbank
        self.verbose = verbose

        # Memory storage path
        self.memory_path = self.project_root / ".swarm" / "memory.db"
        self.memory_path.parent.mkdir(parents=True, exist_ok=True)

        self._log("✓ Claude-Flow Memory initialized")
        self._log(f"  Memory DB: {self.memory_path}")
        self._log(f"  Default namespace: {default_namespace}")
        self._log(f"  ReasoningBank: {'ENABLED' if use_reasoningbank else 'DISABLED'}")

    def _log(self, message: str):
        """Log message if verbose enabled."""
        if self.verbose:
            logger.info(f"[ClaudeFlowMemory] {message}")
            print(f"[ClaudeFlowMemory] {message}")

    async def _run_claude_flow_cmd(
        self,
        args: List[str],
        check: bool = True
    ) -> Tuple[bool, str, str]:
        """
        Run claude-flow command asynchronously.

        Args:
            args: Command arguments
            check: Raise exception on error

        Returns:
            Tuple of (success, stdout, stderr)
        """
        cmd = ["npx", "claude-flow@alpha"] + args

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.project_root)
            )

            stdout, stderr = await process.communicate()

            stdout_str = stdout.decode('utf-8') if stdout else ""
            stderr_str = stderr.decode('utf-8') if stderr else ""

            success = process.returncode == 0

            if not success and check:
                self._log(f"Command failed: {' '.join(cmd)}")
                self._log(f"Error: {stderr_str}")

            return success, stdout_str, stderr_str

        except Exception as e:
            self._log(f"Command execution error: {e}")
            if check:
                raise
            return False, "", str(e)

    async def store_vector(
        self,
        key: str,
        content: str,
        namespace: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Store content with semantic vector embedding using AgentDB.

        Args:
            key: Unique identifier for the memory
            content: Content to store
            namespace: Memory namespace (defaults to default_namespace)
            metadata: Additional metadata to store

        Returns:
            True if successful, False otherwise
        """
        namespace = namespace or self.default_namespace

        self._log(f"Storing vector: {key} in namespace {namespace}")

        # Prepare metadata JSON
        metadata_json = json.dumps(metadata or {})

        # Use claude-flow memory store-vector command
        args = [
            "memory", "store-vector",
            key,
            content,
            "--namespace", namespace,
            "--metadata", metadata_json
        ]

        if self.use_reasoningbank:
            args.append("--reasoningbank")

        success, stdout, stderr = await self._run_claude_flow_cmd(args, check=False)

        if success:
            self._log(f"✓ Vector stored: {key}")
        else:
            self._log(f"✗ Failed to store vector: {key}")
            self._log(f"  Error: {stderr}")

        return success

    async def semantic_search(
        self,
        query: str,
        k: int = 10,
        threshold: float = 0.7,
        namespace: Optional[str] = None
    ) -> List[SearchResult]:
        """
        Search memories by semantic similarity using vector search.

        Args:
            query: Search query
            k: Number of results to return
            threshold: Minimum similarity threshold (0.0-1.0)
            namespace: Namespace to search (None = all namespaces)

        Returns:
            List of SearchResult objects ordered by similarity
        """
        self._log(f"Semantic search: '{query}' (k={k}, threshold={threshold})")

        # Use claude-flow memory vector-search command
        args = [
            "memory", "vector-search",
            query,
            "--k", str(k),
            "--threshold", str(threshold)
        ]

        if namespace:
            args.extend(["--namespace", namespace])

        if self.use_reasoningbank:
            args.append("--reasoningbank")

        success, stdout, stderr = await self._run_claude_flow_cmd(args, check=False)

        if not success:
            self._log(f"✗ Search failed: {stderr}")
            return []

        # Parse results (claude-flow returns JSON)
        try:
            results_data = json.loads(stdout)
            results = []

            for item in results_data.get('results', []):
                result = SearchResult(
                    key=item.get('key', ''),
                    content=item.get('content', ''),
                    similarity_score=item.get('score', 0.0),
                    namespace=item.get('namespace', ''),
                    metadata=item.get('metadata', {}),
                    timestamp=item.get('timestamp', '')
                )
                results.append(result)

            self._log(f"✓ Found {len(results)} results")
            return results

        except json.JSONDecodeError:
            self._log(f"✗ Failed to parse search results")
            return []

    async def store_pattern(
        self,
        key: str,
        content: str,
        namespace: Optional[str] = None
    ) -> bool:
        """
        Store content for pattern matching using ReasoningBank.

        Args:
            key: Unique identifier
            content: Content to store
            namespace: Memory namespace

        Returns:
            True if successful
        """
        namespace = namespace or self.default_namespace

        self._log(f"Storing pattern: {key} in namespace {namespace}")

        # Use claude-flow memory store command (ReasoningBank)
        args = [
            "memory", "store",
            key,
            content,
            "--namespace", namespace,
            "--reasoningbank"
        ]

        success, stdout, stderr = await self._run_claude_flow_cmd(args, check=False)

        if success:
            self._log(f"✓ Pattern stored: {key}")
        else:
            self._log(f"✗ Failed to store pattern: {key}")

        return success

    async def query_patterns(
        self,
        query: str,
        namespace: Optional[str] = None
    ) -> List[SearchResult]:
        """
        Query patterns using ReasoningBank pattern matching (2-3ms latency).

        Args:
            query: Pattern query
            namespace: Namespace to search

        Returns:
            List of matching results
        """
        self._log(f"Pattern query: '{query}'")

        # Use claude-flow memory query command
        args = [
            "memory", "query",
            query,
            "--reasoningbank"
        ]

        if namespace:
            args.extend(["--namespace", namespace])

        success, stdout, stderr = await self._run_claude_flow_cmd(args, check=False)

        if not success:
            self._log(f"✗ Pattern query failed: {stderr}")
            return []

        # Parse results
        try:
            results_data = json.loads(stdout)
            results = []

            for item in results_data.get('results', []):
                result = SearchResult(
                    key=item.get('key', ''),
                    content=item.get('content', ''),
                    similarity_score=item.get('score', 1.0),
                    namespace=item.get('namespace', ''),
                    metadata=item.get('metadata', {}),
                    timestamp=item.get('timestamp', '')
                )
                results.append(result)

            self._log(f"✓ Found {len(results)} pattern matches")
            return results

        except json.JSONDecodeError:
            self._log(f"✗ Failed to parse pattern results")
            return []

    async def retrieve_context(
        self,
        context_description: str,
        k: int = 5,
        use_semantic: bool = True
    ) -> List[SearchResult]:
        """
        Retrieve relevant context for a task using semantic or pattern search.

        Args:
            context_description: Description of needed context
            k: Number of results
            use_semantic: Use semantic search (True) or pattern matching (False)

        Returns:
            List of relevant search results
        """
        if use_semantic:
            return await self.semantic_search(
                query=context_description,
                k=k,
                threshold=0.6
            )
        else:
            return await self.query_patterns(query=context_description)

    async def store_agent_decision(
        self,
        agent_id: str,
        task_id: str,
        decision: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Store agent decision for future learning.

        Args:
            agent_id: Agent identifier
            task_id: Task identifier
            decision: Decision made by agent
            metadata: Additional context

        Returns:
            True if successful
        """
        key = f"agent/{agent_id}/{task_id}/{datetime.now().strftime('%Y%m%d-%H%M%S')}"

        full_metadata = {
            "agent_id": agent_id,
            "task_id": task_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **(metadata or {})
        }

        return await self.store_vector(
            key=key,
            content=decision,
            namespace="agent_decisions",
            metadata=full_metadata
        )

    async def retrieve_similar_decisions(
        self,
        task_description: str,
        agent_id: Optional[str] = None,
        k: int = 5
    ) -> List[SearchResult]:
        """
        Retrieve similar past decisions for a task.

        Args:
            task_description: Current task description
            agent_id: Filter by agent ID (optional)
            k: Number of results

        Returns:
            List of similar past decisions
        """
        results = await self.semantic_search(
            query=task_description,
            k=k,
            threshold=0.7,
            namespace="agent_decisions"
        )

        # Filter by agent_id if provided
        if agent_id:
            results = [
                r for r in results
                if r.metadata.get("agent_id") == agent_id
            ]

        return results

    async def store_workflow_result(
        self,
        session_id: str,
        workflow_data: Dict[str, Any]
    ) -> bool:
        """
        Store complete workflow result for learning.

        Args:
            session_id: Session identifier
            workflow_data: Complete workflow data

        Returns:
            True if successful
        """
        key = f"workflow/{session_id}"
        content = json.dumps(workflow_data, indent=2)

        metadata = {
            "session_id": session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "success": workflow_data.get("success", False),
            "quality_score": workflow_data.get("quality_score", 0.0)
        }

        return await self.store_vector(
            key=key,
            content=content,
            namespace="workflows",
            metadata=metadata
        )

    async def get_memory_stats(self) -> Dict[str, Any]:
        """
        Get memory system statistics.

        Returns:
            Dictionary with memory statistics
        """
        args = ["memory", "status"]

        if self.use_reasoningbank:
            args.append("--reasoningbank")

        success, stdout, stderr = await self._run_claude_flow_cmd(args, check=False)

        if not success:
            return {"error": stderr}

        try:
            return json.loads(stdout)
        except json.JSONDecodeError:
            return {"raw_output": stdout}


# Example usage
async def main():
    """Example usage of Claude-Flow memory integration."""
    memory = ClaudeFlowMemory(
        project_root=Path.cwd(),
        default_namespace="orchestration",
        verbose=True
    )

    # Store a decision
    print("\n=== Storing agent decision ===")
    await memory.store_agent_decision(
        agent_id="claude-planner",
        task_id="task-001",
        decision="Used hierarchical planning approach with 3-phase execution",
        metadata={"success": True, "duration": 45.2}
    )

    # Store another decision
    await memory.store_agent_decision(
        agent_id="codex-implementer",
        task_id="task-002",
        decision="Implemented REST API with JWT authentication using Express.js",
        metadata={"success": True, "files_created": 8}
    )

    # Semantic search
    print("\n=== Semantic search for similar tasks ===")
    results = await memory.semantic_search(
        query="How to implement authentication?",
        k=5,
        threshold=0.6
    )

    for i, result in enumerate(results, 1):
        print(f"\n{i}. Key: {result.key}")
        print(f"   Similarity: {result.similarity_score:.3f}")
        print(f"   Content: {result.content[:100]}...")

    # Get stats
    print("\n=== Memory statistics ===")
    stats = await memory.get_memory_stats()
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
