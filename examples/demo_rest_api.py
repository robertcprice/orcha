"""
REST API Demo: MCP Orchestration System
Demonstrates how to use the REST API endpoints.
"""
import requests
import time
import json
from typing import Dict, Any


class MCPOrchestrationClient:
    """Client for MCP Orchestration REST API."""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url

    def submit_task(
        self,
        task_name: str,
        task_description: str,
        budget_limit: float = 5.0,
        confidence_threshold: float = 95.0
    ) -> Dict[str, Any]:
        """Submit a new task."""
        response = requests.post(
            f"{self.base_url}/api/v1/orchestration/tasks",
            json={
                "task_name": task_name,
                "task_description": task_description,
                "budget_limit": budget_limit,
                "confidence_threshold": confidence_threshold
            }
        )
        response.raise_for_status()
        return response.json()

    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get task status."""
        response = requests.get(
            f"{self.base_url}/api/v1/orchestration/tasks/{task_id}"
        )
        response.raise_for_status()
        return response.json()

    def get_task_result(self, task_id: str) -> Dict[str, Any]:
        """Get task result."""
        response = requests.get(
            f"{self.base_url}/api/v1/orchestration/tasks/{task_id}/result"
        )
        response.raise_for_status()
        return response.json()

    def get_telemetry(self, task_id: str) -> Dict[str, Any]:
        """Get task telemetry."""
        response = requests.get(
            f"{self.base_url}/api/v1/telemetry/tasks/{task_id}"
        )
        response.raise_for_status()
        return response.json()

    def list_jobs(self, status: str = None) -> Dict[str, Any]:
        """List jobs."""
        params = {"status": status} if status else {}
        response = requests.get(
            f"{self.base_url}/api/v1/jobs/",
            params=params
        )
        response.raise_for_status()
        return response.json()

    def get_dag_structure(self) -> Dict[str, Any]:
        """Get DAG structure."""
        response = requests.get(
            f"{self.base_url}/api/v1/orchestration/dag/structure"
        )
        response.raise_for_status()
        return response.json()

    def wait_for_completion(
        self,
        task_id: str,
        poll_interval: int = 5,
        timeout: int = 600
    ) -> Dict[str, Any]:
        """
        Wait for task to complete.

        Args:
            task_id: Task ID
            poll_interval: Polling interval in seconds
            timeout: Timeout in seconds

        Returns:
            Final task result
        """
        start_time = time.time()

        while time.time() - start_time < timeout:
            status = self.get_task_status(task_id)

            if status['status'] in ['completed', 'failed', 'cancelled']:
                return self.get_task_result(task_id)

            print(f"Status: {status['status']} - waiting {poll_interval}s...")
            time.sleep(poll_interval)

        raise TimeoutError(f"Task {task_id} did not complete within {timeout}s")


def main():
    """Run REST API demo."""

    print("\n" + "=" * 80)
    print("MCP ORCHESTRATION SYSTEM - REST API DEMO")
    print("=" * 80 + "\n")

    # Initialize client
    client = MCPOrchestrationClient()

    # Check health
    print("Checking API health...")
    try:
        response = requests.get(f"{client.base_url}/health")
        response.raise_for_status()
        print(f"✓ API is healthy: {response.json()}\n")
    except Exception as e:
        print(f"✗ API is not available: {e}")
        print("Make sure to start the API server first:")
        print("  cd rest-api")
        print("  uvicorn src.main:app --reload")
        return 1

    # Get DAG structure
    print("Getting DAG structure...")
    dag = client.get_dag_structure()
    print(f"✓ DAG has {len(dag['nodes'])} nodes")
    print(f"  Execution order: {dag['execution_order']}\n")

    # Submit task
    print("Submitting task...")
    task = client.submit_task(
        task_name="User Authentication API",
        task_description="""
        Build a secure user authentication API with:
        - User registration endpoint
        - Login endpoint with JWT tokens
        - Password hashing (bcrypt)
        - Input validation
        - Rate limiting
        - Unit tests for all endpoints
        """,
        budget_limit=5.0,
        confidence_threshold=95.0
    )

    task_id = task['task_id']
    print(f"✓ Task submitted: {task_id}")
    print(f"  Status: {task['status']}\n")

    # Wait for completion
    print("Waiting for task to complete...")
    print("(This may take several minutes)\n")

    try:
        result = client.wait_for_completion(task_id, poll_interval=10)

        # Display result
        print("\n" + "=" * 80)
        print("TASK COMPLETE")
        print("=" * 80 + "\n")

        if result['success']:
            print("✓ SUCCESS\n")

            # Artifacts
            print("📦 ARTIFACTS:")
            artifacts = result.get('artifacts', {})
            print(f"  Vault Path: {artifacts.get('vault_path')}")
            print(f"  Code Files: {len(artifacts.get('code_files', {}))}")
            print(f"  Test Files: {len(artifacts.get('test_files', {}))}")

            # Telemetry
            telemetry = client.get_telemetry(task_id)
            print("\n💰 TELEMETRY:")
            print(f"  Total Cost: ${telemetry.get('total_cost', 0):.4f}")
            print(f"  Total Tokens: {telemetry.get('total_tokens', 0):,}")

            # Quality
            print("\n✅ QUALITY:")
            quality = result.get('quality', {})
            print(f"  Final Confidence: {quality.get('final_confidence', 0):.1f}%")
            print(f"  All Gates Passed: {quality.get('all_gates_passed')}")

        else:
            print("✗ FAILED")
            print(f"Error: {result.get('error')}")

        # List all jobs
        print("\n📋 ALL JOBS:")
        jobs = client.list_jobs()
        for job in jobs['jobs'][:5]:
            print(f"  {job['task_id']}: {job['task_name']} - {job['status']}")

    except TimeoutError as e:
        print(f"\n⏱ Timeout: {e}")
        return 1
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1

    print("\n" + "=" * 80 + "\n")
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
