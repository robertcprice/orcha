import { NextResponse } from 'next/server';
import { getEventsBySession } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: 'sessionId parameter is required' },
        { status: 400 }
      );
    }

    const events = getEventsBySession(sessionId, limit);

    return NextResponse.json({
      ok: true,
      events,
      sessionId,
      count: events.length,
    });
  } catch (error) {
    console.error('Error fetching session events:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch session events' },
      { status: 500 }
    );
  }
}
