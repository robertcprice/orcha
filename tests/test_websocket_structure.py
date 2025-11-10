#!/usr/bin/env python3
"""
Comprehensive WebSocket Structure Test
Tests the WebSocket server implementation, client connections, and event flow
"""

import asyncio
import json
import time
import websockets
import aiohttp
import redis.asyncio as redis
from typing import Dict, Any, List


class WebSocketStructureTester:
    def __init__(self):
        self.ws_url = "ws://localhost:4000/ws"
        self.http_url = "http://localhost:4000"
        self.redis_url = "redis://localhost:6379"
        self.test_results: List[Dict[str, Any]] = []

    async def test_server_availability(self):
        """Test 1: Check if WebSocket server is running"""
        test_name = "Server Availability"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.http_url) as response:
                    if response.status == 200:
                        self.test_results.append({
                            "test": test_name,
                            "status": "PASS",
                            "details": "Server is running and responding"
                        })
                        return True
        except Exception as e:
            self.test_results.append({
                "test": test_name,
                "status": "FAIL",
                "details": f"Server not accessible: {str(e)}"
            })
            return False

    async def test_websocket_connection(self):
        """Test 2: Establish WebSocket connection"""
        test_name = "WebSocket Connection"
        try:
            async with websockets.connect(self.ws_url) as ws:
                # Wait for initial message
                initial = await asyncio.wait_for(ws.recv(), timeout=5.0)
                data = json.loads(initial)

                if data.get("type") == "initial":
                    self.test_results.append({
                        "test": test_name,
                        "status": "PASS",
                        "details": f"Connected and received initial data with {len(data.get('data', []))} events"
                    })
                    return True
        except asyncio.TimeoutError:
            self.test_results.append({
                "test": test_name,
                "status": "FAIL",
                "details": "Connection timeout - no initial message received"
            })
        except Exception as e:
            self.test_results.append({
                "test": test_name,
                "status": "FAIL",
                "details": f"Connection failed: {str(e)}"
            })
        return False

    async def test_http_event_submission(self):
        """Test 3: Submit event via HTTP endpoint"""
        test_name = "HTTP Event Submission"
        test_event = {
            "source_app": "test_client",
            "session_id": f"test_session_{int(time.time())}",
            "hook_event_type": "test_event",
            "payload": {
                "message": "Test event from structure test",
                "timestamp": time.time()
            }
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.http_url}/events",
                    json=test_event,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        self.test_results.append({
                            "test": test_name,
                            "status": "PASS",
                            "details": f"Event submitted successfully with ID: {result.get('id')}"
                        })
                        return True
                    else:
                        self.test_results.append({
                            "test": test_name,
                            "status": "FAIL",
                            "details": f"HTTP status {response.status}"
                        })
        except Exception as e:
            self.test_results.append({
                "test": test_name,
                "status": "FAIL",
                "details": f"Event submission failed: {str(e)}"
            })
        return False

    async def test_websocket_broadcast(self):
        """Test 4: Test event broadcasting to multiple WebSocket clients"""
        test_name = "WebSocket Broadcasting"

        try:
            # Connect two WebSocket clients
            async with websockets.connect(self.ws_url) as ws1, \
                       websockets.connect(self.ws_url) as ws2:

                # Clear initial messages
                await asyncio.wait_for(ws1.recv(), timeout=2.0)
                await asyncio.wait_for(ws2.recv(), timeout=2.0)

                # Submit event via HTTP
                test_event = {
                    "source_app": "broadcast_test",
                    "session_id": f"broadcast_{int(time.time())}",
                    "hook_event_type": "broadcast_test",
                    "payload": {"test": "broadcast"}
                }

                async with aiohttp.ClientSession() as session:
                    await session.post(
                        f"{self.http_url}/events",
                        json=test_event
                    )

                # Both clients should receive the event
                msg1 = await asyncio.wait_for(ws1.recv(), timeout=5.0)
                msg2 = await asyncio.wait_for(ws2.recv(), timeout=5.0)

                data1 = json.loads(msg1)
                data2 = json.loads(msg2)

                if (data1.get("type") == "event" and
                    data2.get("type") == "event" and
                    data1.get("data", {}).get("hook_event_type") == "broadcast_test"):
                    self.test_results.append({
                        "test": test_name,
                        "status": "PASS",
                        "details": "Event broadcasted to all connected clients"
                    })
                    return True

        except asyncio.TimeoutError:
            self.test_results.append({
                "test": test_name,
                "status": "FAIL",
                "details": "Broadcast timeout - clients didn't receive event"
            })
        except Exception as e:
            self.test_results.append({
                "test": test_name,
                "status": "FAIL",
                "details": f"Broadcasting test failed: {str(e)}"
            })
        return False

    async def test_redis_integration(self):
        """Test 5: Test Redis pub/sub integration"""
        test_name = "Redis Integration"

        try:
            # Connect to Redis
            redis_client = redis.from_url(self.redis_url)

            # Connect WebSocket to receive events
            async with websockets.connect(self.ws_url) as ws:
                # Clear initial message
                await asyncio.wait_for(ws.recv(), timeout=2.0)

                # Publish to Redis channel
                test_event = {
                    "source_app": "redis_test",
                    "session_id": f"redis_{int(time.time())}",
                    "hook_event_type": "redis_event",
                    "payload": {
                        "message": "Event from Redis",
                        "timestamp": time.time()
                    }
                }

                await redis_client.publish(
                    "algomind.agent.events",
                    json.dumps(test_event)
                )

                # WebSocket should receive the event
                msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                data = json.loads(msg)

                if (data.get("type") == "event" and
                    data.get("data", {}).get("source_app") == "redis_test"):
                    self.test_results.append({
                        "test": test_name,
                        "status": "PASS",
                        "details": "Redis event successfully propagated to WebSocket"
                    })
                    await redis_client.close()
                    return True

        except asyncio.TimeoutError:
            self.test_results.append({
                "test": test_name,
                "status": "FAIL",
                "details": "Redis event not received via WebSocket"
            })
        except Exception as e:
            self.test_results.append({
                "test": test_name,
                "status": "FAIL",
                "details": f"Redis integration failed: {str(e)}"
            })

        if 'redis_client' in locals():
            await redis_client.close()
        return False

    async def test_reconnection_handling(self):
        """Test 6: Test WebSocket reconnection handling"""
        test_name = "Reconnection Handling"

        try:
            # Connect and then disconnect
            ws = await websockets.connect(self.ws_url)
            await asyncio.wait_for(ws.recv(), timeout=2.0)  # Initial message

            # Force disconnect
            await ws.close()

            # Try reconnecting
            await asyncio.sleep(1)  # Brief pause

            async with websockets.connect(self.ws_url) as ws_new:
                initial = await asyncio.wait_for(ws_new.recv(), timeout=5.0)
                data = json.loads(initial)

                if data.get("type") == "initial":
                    self.test_results.append({
                        "test": test_name,
                        "status": "PASS",
                        "details": "Reconnection successful after disconnect"
                    })
                    return True

        except Exception as e:
            self.test_results.append({
                "test": test_name,
                "status": "FAIL",
                "details": f"Reconnection test failed: {str(e)}"
            })
        return False

    async def test_data_persistence(self):
        """Test 7: Test event data persistence"""
        test_name = "Data Persistence"

        try:
            # Submit a unique event
            unique_id = f"persist_{int(time.time() * 1000)}"
            test_event = {
                "source_app": "persistence_test",
                "session_id": unique_id,
                "hook_event_type": "persistence_event",
                "payload": {"unique_marker": unique_id}
            }

            async with aiohttp.ClientSession() as session:
                # Submit event
                await session.post(f"{self.http_url}/events", json=test_event)

                # Wait briefly
                await asyncio.sleep(1)

                # Retrieve recent events
                async with session.get(f"{self.http_url}/events/recent?limit=50") as response:
                    if response.status == 200:
                        events = await response.json()

                        # Check if our event is in the list
                        found = any(
                            e.get("session_id") == unique_id
                            for e in events
                        )

                        if found:
                            self.test_results.append({
                                "test": test_name,
                                "status": "PASS",
                                "details": f"Event persisted and retrievable from database"
                            })
                            return True
                        else:
                            self.test_results.append({
                                "test": test_name,
                                "status": "FAIL",
                                "details": "Event not found in recent events"
                            })

        except Exception as e:
            self.test_results.append({
                "test": test_name,
                "status": "FAIL",
                "details": f"Persistence test failed: {str(e)}"
            })
        return False

    async def test_filter_options(self):
        """Test 8: Test filter options endpoint"""
        test_name = "Filter Options"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.http_url}/events/filter-options") as response:
                    if response.status == 200:
                        options = await response.json()

                        if "source_apps" in options and "hook_event_types" in options:
                            self.test_results.append({
                                "test": test_name,
                                "status": "PASS",
                                "details": f"Filter options available: {len(options.get('source_apps', []))} sources, {len(options.get('hook_event_types', []))} event types"
                            })
                            return True

        except Exception as e:
            self.test_results.append({
                "test": test_name,
                "status": "FAIL",
                "details": f"Filter options test failed: {str(e)}"
            })
        return False

    async def test_message_validation(self):
        """Test 9: Test message validation and error handling"""
        test_name = "Message Validation"

        try:
            async with aiohttp.ClientSession() as session:
                # Send invalid event (missing required fields)
                invalid_event = {"payload": {"test": "invalid"}}

                async with session.post(
                    f"{self.http_url}/events",
                    json=invalid_event
                ) as response:
                    if response.status == 400:
                        error = await response.json()
                        if "error" in error:
                            self.test_results.append({
                                "test": test_name,
                                "status": "PASS",
                                "details": "Server correctly rejects invalid messages"
                            })
                            return True
                    else:
                        self.test_results.append({
                            "test": test_name,
                            "status": "FAIL",
                            "details": f"Invalid message not rejected (status: {response.status})"
                        })

        except Exception as e:
            self.test_results.append({
                "test": test_name,
                "status": "FAIL",
                "details": f"Validation test failed: {str(e)}"
            })
        return False

    async def test_concurrent_connections(self):
        """Test 10: Test handling of multiple concurrent connections"""
        test_name = "Concurrent Connections"

        try:
            # Create 10 concurrent WebSocket connections
            connections = []
            for i in range(10):
                ws = await websockets.connect(self.ws_url)
                connections.append(ws)

            # Wait for all initial messages
            initial_msgs = await asyncio.gather(*[
                asyncio.wait_for(ws.recv(), timeout=5.0)
                for ws in connections
            ])

            # All should receive initial message
            all_valid = all(
                json.loads(msg).get("type") == "initial"
                for msg in initial_msgs
            )

            # Clean up connections
            for ws in connections:
                await ws.close()

            if all_valid:
                self.test_results.append({
                    "test": test_name,
                    "status": "PASS",
                    "details": f"Successfully handled {len(connections)} concurrent connections"
                })
                return True
            else:
                self.test_results.append({
                    "test": test_name,
                    "status": "FAIL",
                    "details": "Not all connections received valid initial messages"
                })

        except Exception as e:
            self.test_results.append({
                "test": test_name,
                "status": "FAIL",
                "details": f"Concurrent connection test failed: {str(e)}"
            })
            # Clean up any remaining connections
            for ws in connections:
                try:
                    await ws.close()
                except:
                    pass
        return False

    async def run_all_tests(self):
        """Run all WebSocket structure tests"""
        print("=" * 60)
        print("WEBSOCKET STRUCTURE TEST SUITE")
        print("=" * 60)
        print()

        # Check if server is running first
        if not await self.test_server_availability():
            print("\n❌ Server is not running. Please start the WebSocket server first.")
            print("   Run: cd web-ui && npm run websocket")
            return

        # Run all tests
        test_methods = [
            self.test_websocket_connection,
            self.test_http_event_submission,
            self.test_websocket_broadcast,
            self.test_redis_integration,
            self.test_reconnection_handling,
            self.test_data_persistence,
            self.test_filter_options,
            self.test_message_validation,
            self.test_concurrent_connections
        ]

        for test in test_methods:
            await test()
            await asyncio.sleep(0.5)  # Brief pause between tests

        # Print results
        print("\n" + "=" * 60)
        print("TEST RESULTS")
        print("=" * 60)

        passed = 0
        failed = 0

        for result in self.test_results:
            status_symbol = "✅" if result["status"] == "PASS" else "❌"
            print(f"\n{status_symbol} {result['test']}")
            print(f"   Status: {result['status']}")
            print(f"   Details: {result['details']}")

            if result["status"] == "PASS":
                passed += 1
            else:
                failed += 1

        print("\n" + "=" * 60)
        print(f"SUMMARY: {passed} passed, {failed} failed out of {len(self.test_results)} tests")
        print("=" * 60)

        # Calculate quality score
        quality_score = (passed / len(self.test_results)) * 10 if self.test_results else 0
        print(f"\nQUALITY_SCORE: {quality_score:.1f}/10")

        return passed == len(self.test_results)


async def main():
    tester = WebSocketStructureTester()
    success = await tester.run_all_tests()
    return 0 if success else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)