/**
 * API endpoint to fetch event history from Redis
 * GET /api/events/history?limit=100
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/0';
const HISTORY_KEY = 'algomind.events.history';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  try {
    // Connect to Redis
    const client = createClient({ url: REDIS_URL });
    await client.connect();

    // Fetch event history (most recent first)
    const eventsJson = await client.lRange(HISTORY_KEY, 0, limit - 1);
    const events = eventsJson.map((e: string) => JSON.parse(e));

    await client.quit();

    return NextResponse.json({
      ok: true,
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('[History API] Failed to fetch events:', error);
    return NextResponse.json({
      ok: false,
      error: 'Failed to fetch event history',
      events: [],
      count: 0,
    }, { status: 500 });
  }
}
