#!/usr/bin/env python3
"""Complete test of WebSocket server + Redis pub/sub"""
import asyncio
import json
import sys
from pathlib import Path

# Remove project from path to avoid stub
project_root = str(Path(__file__).parent)
if project_root in sys.path:
    sys.path.remove(project_root)

import os
import redis.asyncio as aioredis
import redis
from aiohttp import web, ClientSession

REDIS_URL = "redis://localhost:6379/0"
REDIS_CHANNEL = "algomind.agent.events"
TEST_PORT = int(os.getenv("WEBSOCKET_TEST_PORT", "4100"))

# Store connected WebSocket clients
clients = set()

async def handle_websocket(request):
    """Handle WebSocket connections from clients"""
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    clients.add(ws)
    client_id = id(ws)
    print(f"✅ WebSocket client {client_id} connected")

    try:
        # Send initial message
        await ws.send_json({
            "type": "connection",
            "status": "connected"
        })

        # Keep connection alive
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                print(f"  Received from client: {msg.data}")
            elif msg.type == web.WSMsgType.ERROR:
                print(f"  WebSocket error: {ws.exception()}")
    finally:
        clients.discard(ws)
        print(f"❌ WebSocket client {client_id} disconnected")

    return ws

async def redis_listener(app):
    """Listen to Redis pub/sub and broadcast to WebSocket clients"""
    redis_client = None
    pubsub = None
    try:
        # Create Redis client
        redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
        await redis_client.ping()
        print("✅ Redis listener connected")

        # Create pubsub instance
        pubsub = redis_client.pubsub()

        # Subscribe to channel (await is required for async redis)
        await pubsub.subscribe(REDIS_CHANNEL)
        print(f"📡 Subscribed to Redis channel: {REDIS_CHANNEL}")

        # Listen for messages using async for loop
        async for message in pubsub.listen():
            # Skip subscription confirmation messages
            if message['type'] != 'message':
                continue

            try:
                # Parse the event data
                event_data = json.loads(message['data'])
                print(f"📨 Received event: {event_data.get('event_type', 'unknown')}")

                # Broadcast to all connected clients
                if clients:
                    for ws in clients:
                        try:
                            await ws.send_json({
                                "type": "event",
                                "data": event_data
                            })
                        except Exception as e:
                            print(f"Failed to send to client: {e}")

                    print(f"📤 Broadcasted to {len(clients)} clients")
                else:
                    print("  (No clients connected)")

            except Exception as e:
                print(f"Error processing message: {e}")

    except Exception as e:
        print(f"Redis listener error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if pubsub:
            await pubsub.aclose()
        if redis_client:
            await redis_client.aclose()

async def start_background_tasks(app):
    """Start background tasks when server starts"""
    app['redis_task'] = asyncio.create_task(redis_listener(app))

async def cleanup_background_tasks(app):
    """Cleanup background tasks when server stops"""
    if 'redis_task' in app:
        app['redis_task'].cancel()
        try:
            await app['redis_task']
        except asyncio.CancelledError:
            pass

def create_app():
    """Create and configure the aiohttp application"""
    app = web.Application()
    app.router.add_get('/ws', handle_websocket)
    app.on_startup.append(start_background_tasks)
    app.on_cleanup.append(cleanup_background_tasks)
    return app

async def test_client():
    """Test WebSocket client that connects and receives messages"""
    print("\n=== TEST CLIENT ===")
    await asyncio.sleep(2)  # Let server start

    try:
        async with ClientSession() as session:
            async with session.ws_connect(f'http://localhost:{TEST_PORT}/ws') as ws:
                print("✅ Test client connected to WebSocket")

                # Receive connection message
                msg = await ws.receive_json()
                print(f"  Received: {msg}")

                # Wait for events
                received_count = 0
                async for msg in ws:
                    if msg.type == web.WSMsgType.TEXT:
                        data = json.loads(msg.data)
                        print(f"  📨 Received event: {data}")
                        received_count += 1

                        if received_count >= 3:
                            print("  Received 3 events, closing...")
                            break

                print(f"✅ Test client received {received_count} events")
    except Exception as e:
        print(f"❌ Test client error: {e}")

async def test_publisher():
    """Publish test events to Redis"""
    print("\n=== TEST PUBLISHER ===")
    await asyncio.sleep(3)  # Let server and client start

    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    print("✅ Publisher connected to Redis")

    for i in range(3):
        event = {
            'event_type': f'test_event_{i+1}',
            'source_app': 'test-publisher',
            'content': f'Test message {i+1}',
            'session_id': 'test-session'
        }

        result = redis_client.publish(REDIS_CHANNEL, json.dumps(event))
        print(f"✅ Published event #{i+1} (subscribers: {result})")
        await asyncio.sleep(0.5)

    redis_client.close()
    await asyncio.sleep(1)  # Let client receive final message
    print("✅ Publisher complete")

async def run_server():
    """Run the web server"""
    app = create_app()
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', TEST_PORT)
    await site.start()
    print("=== WEBSOCKET SERVER ===")
    print(f"✅ Server started on port {TEST_PORT}")

    # Wait for tests to complete
    await asyncio.sleep(10)

    # Cleanup
    await runner.cleanup()

async def main():
    """Run all components"""
    print("=" * 70)
    print("WEBSOCKET + REDIS PUB/SUB INTEGRATION TEST")
    print("=" * 70)

    # Run server, client, and publisher concurrently
    await asyncio.gather(
        run_server(),
        test_client(),
        test_publisher()
    )

    print("\n" + "=" * 70)
    print("✅ TEST COMPLETE!")
    print("=" * 70)

if __name__ == '__main__':
    asyncio.run(main())
