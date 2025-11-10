#!/usr/bin/env python3
"""
WebSocket Server for Real-Time Agent Event Streaming

Listens to Redis pub/sub channels and broadcasts events to connected WebSocket clients.
Used by the web UI to display live agent activity.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

# IMPORTANT: Remove project root from sys.path to avoid importing local redis stub
# We need the real redis package for async pub/sub support
project_root = str(Path(__file__).parent)
if project_root in sys.path:
    sys.path.remove(project_root)

import redis.asyncio as aioredis
from aiohttp import web
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Store connected WebSocket clients
clients = set()

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
REDIS_CHANNEL = os.getenv("AGENT_EVENT_CHANNEL", "algomind.agent.events")
WEBSOCKET_PORT = int(os.getenv("WEBSOCKET_SERVER_PORT", "4000"))


async def handle_websocket(request):
    """Handle WebSocket connections from clients"""
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    clients.add(ws)
    client_id = id(ws)
    logger.info(f"✅ Client {client_id} connected ({len(clients)} total clients)")

    try:
        # Send initial connection message
        await ws.send_json({
            "type": "connection",
            "status": "connected",
            "message": "WebSocket connection established",
            "timestamp": asyncio.get_event_loop().time()
        })

        # Keep connection alive
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                logger.debug(f"Received message from client {client_id}: {msg.data}")
            elif msg.type == web.WSMsgType.ERROR:
                logger.error(f"WebSocket error from client {client_id}: {ws.exception()}")

    except Exception as e:
        logger.error(f"Error handling client {client_id}: {e}")
    finally:
        clients.discard(ws)
        logger.info(f"❌ Client {client_id} disconnected ({len(clients)} remaining clients)")

    return ws


async def redis_listener(app):
    """Listen to Redis pub/sub and broadcast to WebSocket clients"""
    redis_client = None
    pubsub = None
    retry_count = 0
    max_retries = 10
    retry_delay = 5

    while retry_count < max_retries:
        try:
            # Create Redis client
            logger.info(f"Connecting to Redis (attempt {retry_count + 1}/{max_retries})...")
            redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
            await redis_client.ping()
            logger.info("✅ Connected to Redis")

            # Create pubsub instance
            pubsub = redis_client.pubsub()
            logger.info(f"Pubsub created: {pubsub}")

            # Subscribe to channel (await is required for async redis)
            await pubsub.subscribe(REDIS_CHANNEL)
            logger.info(f"📡 Subscribed to Redis channel: {REDIS_CHANNEL}")

            # Reset retry count on successful connection
            retry_count = 0

            # Listen for messages using async for loop (correct pattern for redis.asyncio)
            async for message in pubsub.listen():
                # Skip subscription confirmation messages
                if message['type'] != 'message':
                    logger.debug(f"Skipping non-message: {message['type']}")
                    continue

                try:
                    # Parse the event data
                    event_data = json.loads(message['data'])
                    logger.info(f"📨 Received event: {event_data.get('event_type', 'unknown')} from {event_data.get('agent_id', 'unknown')}")

                    # Broadcast to all connected clients
                    if clients:
                        disconnected = set()
                        for ws in clients:
                            try:
                                await ws.send_json({
                                    "type": "event",
                                    "data": event_data,
                                    "timestamp": asyncio.get_event_loop().time()
                                })
                            except Exception as e:
                                logger.error(f"Failed to send to client: {e}")
                                disconnected.add(ws)

                        # Remove disconnected clients
                        clients.difference_update(disconnected)

                        logger.info(f"📤 Broadcasted event to {len(clients)} clients")
                    else:
                        logger.debug("No clients connected, event not broadcasted")

                except json.JSONDecodeError as e:
                    logger.error(f"Failed to decode Redis message: {message['data']}, error: {e}")
                except Exception as e:
                    logger.error(f"Error processing Redis message: {e}")

        except asyncio.CancelledError:
            logger.info("Redis listener task cancelled (server shutting down)")
            break
        except Exception as e:
            retry_count += 1
            logger.error(f"Redis listener error (attempt {retry_count}/{max_retries}): {e}")
            if retry_count < max_retries:
                logger.info(f"Retrying in {retry_delay} seconds...")
                await asyncio.sleep(retry_delay)
            else:
                logger.error("Max retries reached, giving up on Redis connection")
                import traceback
                logger.error(traceback.format_exc())
                break
        finally:
            # Clean up current connection before retry
            if pubsub:
                try:
                    await pubsub.aclose()
                except Exception:
                    pass
            if redis_client:
                try:
                    await redis_client.aclose()
                except Exception:
                    pass
            pubsub = None
            redis_client = None


async def start_background_tasks(app):
    """Start background tasks when server starts"""
    app['redis_task'] = asyncio.create_task(redis_listener(app))
    logger.info("🚀 Background tasks started")


async def cleanup_background_tasks(app):
    """Cleanup background tasks when server stops"""
    app['redis_task'].cancel()
    await app['redis_task']
    logger.info("🛑 Background tasks stopped")


def create_app():
    """Create and configure the aiohttp application"""
    app = web.Application()

    # Add WebSocket route
    app.router.add_get('/ws', handle_websocket)

    # Add health check route
    async def health_check(request):
        return web.json_response({
            "status": "healthy",
            "clients": len(clients),
            "redis_channel": REDIS_CHANNEL
        })

    app.router.add_get('/health', health_check)

    # Setup background tasks
    app.on_startup.append(start_background_tasks)
    app.on_cleanup.append(cleanup_background_tasks)

    return app


def main():
    """Main entry point"""
    logger.info("=" * 70)
    logger.info("WebSocket Server for AI Agent Event Streaming")
    logger.info("=" * 70)
    logger.info(f"Redis URL: {REDIS_URL}")
    logger.info(f"Redis Channel: {REDIS_CHANNEL}")
    logger.info(f"WebSocket Endpoint: ws://localhost:{WEBSOCKET_PORT}/ws")
    logger.info(f"Health Check: http://localhost:{WEBSOCKET_PORT}/health")
    logger.info("=" * 70)

    app = create_app()
    web.run_app(app, host='0.0.0.0', port=WEBSOCKET_PORT)


if __name__ == '__main__':
    main()
