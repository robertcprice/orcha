import { NextResponse } from 'next/server';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export async function GET() {

  let redis;

  try {

    // Connect to Redis
    redis = createClient({ url: REDIS_URL });
    await redis.connect();

    // Get current session ID
    const sessionId = await redis.get('claude:current_session');

    if (!sessionId) {
      return NextResponse.json({
        active: false,
        session: null,
        messages: []
      });
    }

    // Get session metadata
    const sessionData = await redis.hGetAll(`claude:session:${sessionId}`);

    // Get recent messages (last 50)
    const messages = await redis.lRange(`claude:session:${sessionId}:messages`, 0, 49);

    const parsedMessages = messages.map(msg => {
      try {
        return JSON.parse(msg);
      } catch (error) {
        return null;
      }
    }).filter(msg => msg !== null);

    await redis.quit();

    return NextResponse.json({
      active: true,
      session: {
        id: sessionData.id || sessionId,
        startTime: sessionData.startTime,
        endTime: sessionData.endTime || null,
        messageCount: parseInt(sessionData.messageCount || '0', 10)
      },
      messages: parsedMessages
    });

  } catch (error) {
    console.error('❌ Error fetching current session:', error);

    if (redis) {
      await redis.quit().catch(() => {});
    }

    return NextResponse.json({
      active: false,
      session: null,
      messages: [],
      error: 'Failed to fetch session data'
    }, { status: 500 });
  }
}
