"""
Telemetry system for cost tracking, metrics, and monitoring.
Tracks MCP usage, token consumption, and execution performance.

Aligned with Anthropic's MCP Best Practices:
- Granular cost tracking per MCP call
- Token efficiency monitoring
- Budget enforcement
- Alert thresholds
"""
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
import json
import csv


@dataclass
class MCPCall:
    """Individual MCP call record"""
    timestamp: datetime
    server: str
    tool: str
    node_id: str
    tokens_used: int
    cost: float
    latency_ms: float
    success: bool
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data


@dataclass
class NodeMetrics:
    """Metrics for a single node execution"""
    node_id: str
    node_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str = 'running'

    # Resource metrics
    tokens_used: int = 0
    cost: float = 0.0
    mcp_calls: int = 0

    # Performance metrics
    duration_ms: float = 0.0
    confidence_score: float = 0.0

    # Efficiency metrics
    tokens_loaded: int = 0  # Total tool defs loaded
    tokens_needed: int = 0  # Minimal needed tokens
    efficiency_percent: float = 0.0  # (1 - loaded/needed) * 100

    def complete(self, end_time: datetime, status: str = 'completed'):
        """Mark node as complete"""
        self.end_time = end_time
        self.status = status
        self.duration_ms = (end_time - self.start_time).total_seconds() * 1000

        # Calculate efficiency
        if self.tokens_needed > 0:
            self.efficiency_percent = max(
                0, 100 - (self.tokens_loaded / self.tokens_needed * 100)
            )

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary"""
        data = asdict(self)
        data['start_time'] = self.start_time.isoformat()
        if self.end_time:
            data['end_time'] = self.end_time.isoformat()
        return data


@dataclass
class Budget:
    """Budget constraints for execution"""
    tokens_max: int
    cost_max_usd: float
    time_max_seconds: int

    # Current usage
    tokens_used: int = 0
    cost_used: float = 0.0
    time_used: float = 0.0

    # Alert thresholds (as percentage of max)
    alert_threshold_percent: float = 90.0

    def add_usage(self, tokens: int, cost: float, time: float):
        """Add usage to budget"""
        self.tokens_used += tokens
        self.cost_used += cost
        self.time_used += time

    def is_exceeded(self) -> bool:
        """Check if any budget limit exceeded"""
        return (
            self.tokens_used > self.tokens_max or
            self.cost_used > self.cost_max_usd or
            self.time_used > self.time_max_seconds
        )

    def is_near_limit(self) -> bool:
        """Check if approaching budget limit"""
        threshold = self.alert_threshold_percent / 100
        return (
            self.tokens_used > self.tokens_max * threshold or
            self.cost_used > self.cost_max_usd * threshold or
            self.time_used > self.time_max_seconds * threshold
        )

    def get_remaining(self) -> Dict[str, Any]:
        """Get remaining budget"""
        return {
            'tokens': self.tokens_max - self.tokens_used,
            'cost': self.cost_max_usd - self.cost_used,
            'time': self.time_max_seconds - self.time_used
        }

    def get_utilization(self) -> Dict[str, float]:
        """Get budget utilization percentages"""
        return {
            'tokens': (self.tokens_used / self.tokens_max * 100) if self.tokens_max > 0 else 0,
            'cost': (self.cost_used / self.cost_max_usd * 100) if self.cost_max_usd > 0 else 0,
            'time': (self.time_used / self.time_max_seconds * 100) if self.time_max_seconds > 0 else 0
        }


class TelemetryCollector:
    """
    Centralized telemetry collection system.

    Features:
    - Per-MCP-call tracking
    - Node-level metrics aggregation
    - Budget enforcement
    - Cost ledger generation
    - Alert generation
    - CSV export for analysis
    """

    def __init__(
        self,
        task_id: str,
        budget: Optional[Budget] = None,
        output_dir: str = './telemetry'
    ):
        """
        Initialize telemetry collector.

        Args:
            task_id: Unique task identifier
            budget: Optional budget constraints
            output_dir: Directory for telemetry output
        """
        self.task_id = task_id
        self.budget = budget
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True, parents=True)

        # Data collections
        self.mcp_calls: List[MCPCall] = []
        self.node_metrics: Dict[str, NodeMetrics] = {}
        self.alerts: List[Dict[str, Any]] = []

        # Summary stats
        self.start_time = datetime.now()
        self.end_time: Optional[datetime] = None

    def record_mcp_call(
        self,
        server: str,
        tool: str,
        node_id: str,
        tokens_used: int,
        cost: float,
        latency_ms: float,
        success: bool = True,
        error: Optional[str] = None
    ):
        """
        Record an MCP call.

        Args:
            server: MCP server name
            tool: Tool name
            node_id: Node making the call
            tokens_used: Tokens consumed
            cost: Cost in USD
            latency_ms: Latency in milliseconds
            success: Whether call succeeded
            error: Error message if failed
        """
        call = MCPCall(
            timestamp=datetime.now(),
            server=server,
            tool=tool,
            node_id=node_id,
            tokens_used=tokens_used,
            cost=cost,
            latency_ms=latency_ms,
            success=success,
            error=error
        )

        self.mcp_calls.append(call)

        # Update node metrics
        if node_id in self.node_metrics:
            self.node_metrics[node_id].tokens_used += tokens_used
            self.node_metrics[node_id].cost += cost
            self.node_metrics[node_id].mcp_calls += 1

        # Update budget
        if self.budget:
            self.budget.add_usage(tokens_used, cost, latency_ms / 1000)

            # Check for budget alerts
            if self.budget.is_exceeded():
                self._create_alert(
                    'budget_exceeded',
                    f'Budget exceeded: {self.budget.get_utilization()}'
                )
            elif self.budget.is_near_limit():
                self._create_alert(
                    'budget_warning',
                    f'Approaching budget limit: {self.budget.get_utilization()}'
                )

    def start_node(self, node_id: str, node_name: str):
        """Record node execution start"""
        self.node_metrics[node_id] = NodeMetrics(
            node_id=node_id,
            node_name=node_name,
            start_time=datetime.now()
        )

    def complete_node(
        self,
        node_id: str,
        status: str = 'completed',
        confidence_score: float = 0.0,
        tokens_loaded: int = 0,
        tokens_needed: int = 0
    ):
        """Record node execution completion"""
        if node_id not in self.node_metrics:
            return

        metrics = self.node_metrics[node_id]
        metrics.complete(datetime.now(), status)
        metrics.confidence_score = confidence_score
        metrics.tokens_loaded = tokens_loaded
        metrics.tokens_needed = tokens_needed

    def _create_alert(self, alert_type: str, message: str):
        """Create an alert"""
        alert = {
            'type': alert_type,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'task_id': self.task_id
        }
        self.alerts.append(alert)

    def get_summary(self) -> Dict[str, Any]:
        """Get telemetry summary"""
        total_tokens = sum(call.tokens_used for call in self.mcp_calls)
        total_cost = sum(call.cost for call in self.mcp_calls)
        total_calls = len(self.mcp_calls)
        successful_calls = sum(1 for call in self.mcp_calls if call.success)

        # Server breakdown
        server_stats = {}
        for call in self.mcp_calls:
            if call.server not in server_stats:
                server_stats[call.server] = {
                    'calls': 0,
                    'tokens': 0,
                    'cost': 0.0
                }
            server_stats[call.server]['calls'] += 1
            server_stats[call.server]['tokens'] += call.tokens_used
            server_stats[call.server]['cost'] += call.cost

        # Node breakdown
        node_stats = {
            node_id: {
                'name': metrics.node_name,
                'tokens': metrics.tokens_used,
                'cost': metrics.cost,
                'duration_ms': metrics.duration_ms,
                'confidence': metrics.confidence_score,
                'efficiency': metrics.efficiency_percent
            }
            for node_id, metrics in self.node_metrics.items()
        }

        return {
            'task_id': self.task_id,
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'total_calls': total_calls,
            'successful_calls': successful_calls,
            'success_rate': (successful_calls / total_calls * 100) if total_calls > 0 else 0,
            'total_tokens': total_tokens,
            'total_cost': total_cost,
            'avg_tokens_per_call': total_tokens / total_calls if total_calls > 0 else 0,
            'avg_cost_per_call': total_cost / total_calls if total_calls > 0 else 0,
            'by_server': server_stats,
            'by_node': node_stats,
            'budget': {
                'allocated': {
                    'tokens': self.budget.tokens_max if self.budget else 0,
                    'cost': self.budget.cost_max_usd if self.budget else 0
                },
                'used': {
                    'tokens': self.budget.tokens_used if self.budget else total_tokens,
                    'cost': self.budget.cost_used if self.budget else total_cost
                },
                'utilization': self.budget.get_utilization() if self.budget else {}
            },
            'alerts': len(self.alerts)
        }

    def export_cost_ledger(self, format: str = 'csv') -> Path:
        """
        Export cost ledger for accounting.

        Args:
            format: 'csv' or 'json'

        Returns:
            Path to exported file
        """
        if format == 'csv':
            return self._export_csv()
        elif format == 'json':
            return self._export_json()
        else:
            raise ValueError(f"Unknown format: {format}")

    def _export_csv(self) -> Path:
        """Export to CSV"""
        filepath = self.output_dir / f'{self.task_id}_cost_ledger.csv'

        with open(filepath, 'w', newline='') as f:
            writer = csv.writer(f)

            # Header
            writer.writerow([
                'Timestamp', 'Node', 'Server', 'Tool',
                'Tokens', 'Cost (USD)', 'Latency (ms)',
                'Success', 'Error'
            ])

            # Data rows
            for call in self.mcp_calls:
                writer.writerow([
                    call.timestamp.isoformat(),
                    call.node_id,
                    call.server,
                    call.tool,
                    call.tokens_used,
                    f'{call.cost:.4f}',
                    f'{call.latency_ms:.2f}',
                    'Yes' if call.success else 'No',
                    call.error or ''
                ])

            # Summary row
            summary = self.get_summary()
            writer.writerow([])
            writer.writerow(['SUMMARY'])
            writer.writerow(['Total Calls', summary['total_calls']])
            writer.writerow(['Total Tokens', summary['total_tokens']])
            writer.writerow(['Total Cost (USD)', f"${summary['total_cost']:.4f}"])
            writer.writerow(['Success Rate', f"{summary['success_rate']:.1f}%"])

        return filepath

    def _export_json(self) -> Path:
        """Export to JSON"""
        filepath = self.output_dir / f'{self.task_id}_telemetry.json'

        data = {
            'summary': self.get_summary(),
            'mcp_calls': [call.to_dict() for call in self.mcp_calls],
            'node_metrics': {
                node_id: metrics.to_dict()
                for node_id, metrics in self.node_metrics.items()
            },
            'alerts': self.alerts
        }

        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

        return filepath

    def finalize(self):
        """Finalize telemetry collection"""
        self.end_time = datetime.now()

        # Export ledger
        csv_path = self.export_cost_ledger('csv')
        json_path = self.export_cost_ledger('json')

        print(f"✓ Telemetry finalized")
        print(f"  CSV ledger: {csv_path}")
        print(f"  JSON data: {json_path}")
        print(f"  Total cost: ${self.get_summary()['total_cost']:.4f}")


# Factory function
def create_telemetry_for_task(
    task_id: str,
    token_budget: int = 200000,
    cost_budget: float = 2.0,
    time_budget: int = 3600
) -> TelemetryCollector:
    """
    Create telemetry collector for a task.

    Args:
        task_id: Task identifier
        token_budget: Max tokens
        cost_budget: Max cost in USD
        time_budget: Max time in seconds

    Returns:
        TelemetryCollector instance
    """
    budget = Budget(
        tokens_max=token_budget,
        cost_max_usd=cost_budget,
        time_max_seconds=time_budget
    )

    return TelemetryCollector(
        task_id=task_id,
        budget=budget,
        output_dir='./telemetry'
    )
