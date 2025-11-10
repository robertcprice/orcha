"""
Playwright API Tests for MCP Orchestration REST API
Tests all endpoints using Playwright's API testing capabilities
"""
import pytest
import asyncio
import json
import time
from pathlib import Path


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


class TestRESTAPIWithPlaywright:
    """Test REST API using Playwright."""

    @pytest.fixture(autouse=True)
    async def setup(self, page):
        """Setup for each test."""
        self.page = page
        self.base_url = "http://localhost:8000"

    async def test_health_endpoint(self, page):
        """Test health check endpoint."""
        print("\n" + "="*80)
        print("TEST: Health Check Endpoint")
        print("="*80)

        response = await page.request.get(f"{self.base_url}/health")

        assert response.ok
        data = await response.json()
        assert data["status"] == "healthy"
        assert "version" in data

        print(f"✓ Health check passed: {data}")

    async def test_submit_task_endpoint(self, page):
        """Test task submission endpoint."""
        print("\n" + "="*80)
        print("TEST: Task Submission")
        print("="*80)

        task_data = {
            "task_name": "Playwright Test Task",
            "task_description": "Test task submitted via Playwright",
            "budget_limit": 1.0,
            "confidence_threshold": 95.0
        }

        response = await page.request.post(
            f"{self.base_url}/api/v1/orchestration/tasks",
            data=task_data
        )

        assert response.ok
        data = await response.json()

        assert data["success"] == True
        assert "task_id" in data
        assert data["status"] == "queued"

        print(f"✓ Task submitted: {data['task_id']}")

        # Save task_id for other tests
        return data["task_id"]

    async def test_get_task_status(self, page):
        """Test get task status endpoint."""
        print("\n" + "="*80)
        print("TEST: Get Task Status")
        print("="*80)

        # First submit a task
        task_id = await self.test_submit_task_endpoint(page)

        # Get status
        response = await page.request.get(
            f"{self.base_url}/api/v1/orchestration/tasks/{task_id}"
        )

        assert response.ok
        data = await response.json()

        assert data["task_id"] == task_id
        assert "status" in data

        print(f"✓ Task status retrieved: {data['status']}")

    async def test_get_dag_structure(self, page):
        """Test DAG structure endpoint."""
        print("\n" + "="*80)
        print("TEST: Get DAG Structure")
        print("="*80)

        response = await page.request.get(
            f"{self.base_url}/api/v1/orchestration/dag/structure"
        )

        assert response.ok
        data = await response.json()

        assert "nodes" in data
        assert "edges" in data
        assert "execution_order" in data
        assert len(data["nodes"]) == 11  # Should have 11 nodes

        print(f"✓ DAG structure retrieved: {len(data['nodes'])} nodes")
        print(f"  Execution order: {data['execution_order']}")

    async def test_list_nodes(self, page):
        """Test list nodes endpoint."""
        print("\n" + "="*80)
        print("TEST: List Nodes")
        print("="*80)

        response = await page.request.get(
            f"{self.base_url}/api/v1/orchestration/nodes"
        )

        assert response.ok
        data = await response.json()

        assert "nodes" in data
        assert len(data["nodes"]) == 11

        print(f"✓ Nodes listed: {len(data['nodes'])} nodes")
        for node in data["nodes"]:
            print(f"  - {node['id']}: {node['name']}")

    async def test_list_jobs(self, page):
        """Test list jobs endpoint."""
        print("\n" + "="*80)
        print("TEST: List Jobs")
        print("="*80)

        response = await page.request.get(
            f"{self.base_url}/api/v1/jobs/"
        )

        assert response.ok
        data = await response.json()

        assert "jobs" in data
        assert "total" in data
        assert "page" in data

        print(f"✓ Jobs listed: {data['total']} total jobs")

    async def test_get_job_stats(self, page):
        """Test job stats endpoint."""
        print("\n" + "="*80)
        print("TEST: Get Job Stats")
        print("="*80)

        response = await page.request.get(
            f"{self.base_url}/api/v1/jobs/stats"
        )

        assert response.ok
        data = await response.json()

        assert "total" in data
        assert "by_status" in data

        print(f"✓ Job stats retrieved: {data['total']} total jobs")
        print(f"  By status: {data['by_status']}")

    async def test_telemetry_summary(self, page):
        """Test telemetry summary endpoint."""
        print("\n" + "="*80)
        print("TEST: Telemetry Summary")
        print("="*80)

        response = await page.request.get(
            f"{self.base_url}/api/v1/telemetry/summary"
        )

        assert response.ok
        data = await response.json()

        assert "total_cost" in data
        assert "total_tokens" in data
        assert "total_calls" in data

        print(f"✓ Telemetry summary retrieved")
        print(f"  Total cost: ${data['total_cost']:.4f}")
        print(f"  Total tokens: {data['total_tokens']:,}")

    async def test_api_error_handling(self, page):
        """Test API error handling."""
        print("\n" + "="*80)
        print("TEST: API Error Handling")
        print("="*80)

        # Try to get non-existent task
        response = await page.request.get(
            f"{self.base_url}/api/v1/orchestration/tasks/invalid_task_id"
        )

        # Should return 404
        assert response.status == 404

        print("✓ Error handling works correctly")


@pytest.mark.asyncio
async def test_full_api_workflow(page):
    """Test complete API workflow."""
    print("\n" + "="*80)
    print("INTEGRATION TEST: Full API Workflow")
    print("="*80)

    base_url = "http://localhost:8000"

    # 1. Check health
    print("\n1. Checking API health...")
    response = await page.request.get(f"{base_url}/health")
    assert response.ok
    print("   ✓ API is healthy")

    # 2. Get DAG structure
    print("\n2. Getting DAG structure...")
    response = await page.request.get(f"{base_url}/api/v1/orchestration/dag/structure")
    assert response.ok
    dag = await response.json()
    print(f"   ✓ DAG has {len(dag['nodes'])} nodes")

    # 3. Submit task
    print("\n3. Submitting task...")
    task_data = {
        "task_name": "Integration Test Task",
        "task_description": "Complete workflow test via Playwright",
        "budget_limit": 2.0,
        "confidence_threshold": 95.0
    }

    response = await page.request.post(
        f"{base_url}/api/v1/orchestration/tasks",
        data=task_data
    )
    assert response.ok
    task_result = await response.json()
    task_id = task_result["task_id"]
    print(f"   ✓ Task submitted: {task_id}")

    # 4. Check task status
    print("\n4. Checking task status...")
    response = await page.request.get(
        f"{base_url}/api/v1/orchestration/tasks/{task_id}"
    )
    assert response.ok
    status = await response.json()
    print(f"   ✓ Task status: {status['status']}")

    # 5. List all jobs
    print("\n5. Listing all jobs...")
    response = await page.request.get(f"{base_url}/api/v1/jobs/")
    assert response.ok
    jobs = await response.json()
    print(f"   ✓ Total jobs: {jobs['total']}")

    # 6. Get job stats
    print("\n6. Getting job statistics...")
    response = await page.request.get(f"{base_url}/api/v1/jobs/stats")
    assert response.ok
    stats = await response.json()
    print(f"   ✓ Job stats: {stats['by_status']}")

    print("\n" + "="*80)
    print("✓ FULL WORKFLOW TEST PASSED")
    print("="*80)


def run_playwright_tests():
    """Run Playwright tests."""
    print("\n" + "="*80)
    print("PLAYWRIGHT API TESTS - MCP ORCHESTRATION SYSTEM")
    print("="*80 + "\n")

    print("NOTE: Make sure the REST API server is running:")
    print("  cd rest-api")
    print("  uvicorn src.main:app --reload")
    print("\n" + "="*80 + "\n")

    # Run pytest
    import subprocess
    result = subprocess.run(
        ["pytest", __file__, "-v", "-s"],
        cwd=Path(__file__).parent.parent
    )

    return result.returncode == 0


if __name__ == "__main__":
    import sys
    success = run_playwright_tests()
    sys.exit(0 if success else 1)
