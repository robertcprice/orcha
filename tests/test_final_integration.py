#!/usr/bin/env python3
"""Final integration test - WebSocket client receiving events through Redis pub/sub"""
import asyncio
import sys
from aiohttp import ClientSession, WSMsgType

async def websocket_client():
    """Connect to WebSocket server and receive events"""
    print("=" * 70)
    print("FINAL INTEGRATION TEST - WebSocket + Redis Pub/Sub")
    print("=" * 70)

    try:
        async with ClientSession() as session:
            async with session.ws_connect('http://localhost:4000/ws') as ws:
                print("\n✅ Connected to WebSocket server at ws://localhost:4000/ws")

                # Receive connection message
                msg = await ws.receive_json()
                print(f"📨 Initial message: {msg.get('type')}: {msg.get('status')}")

                print("\n📡 Waiting for events (will timeout after 10 seconds)...")
                received_events = []

                try:
                    async def listen():
                        async for msg in ws:
                            if msg.type == WSMsgType.TEXT:
                                data = msg.json()
                                if data.get('type') == 'event':
                                    event_data = data.get('data', {})
                                    event_type = event_data.get('event_type')
                                    source = event_data.get('source_app')
                                    content = event_data.get('content', '')
                                    print(f"  📨 Event: {event_type} from {source}")
                                    print(f"     Content: {content[:80]}...")
                                    received_events.append(event_data)

                                    if len(received_events) >= 3:
                                        return

                    await asyncio.wait_for(listen(), timeout=10.0)

                except asyncio.TimeoutError:
                    print("\n⏱️  Timeout reached")

                print(f"\n✅ Received {len(received_events)} events total")

                if len(received_events) >= 3:
                    print("\n🎉 SUCCESS! All events received through WebSocket!")
                    return True
                else:
                    print("\n⚠️  Expected 3+ events, but only received {len(received_events)}")
                    return False

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    # Wait a bit for any existing publishers
    await asyncio.sleep(1)

    # Start the WebSocket client
    success = await websocket_client()

    print("\n" + "=" * 70)
    if success:
        print("✅ INTEGRATION TEST PASSED")
    else:
        print("❌ INTEGRATION TEST FAILED")
    print("=" * 70)

    return success

if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main()) else 1)
