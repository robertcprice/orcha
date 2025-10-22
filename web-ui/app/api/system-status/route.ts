import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // In a real implementation, check actual Redis connection, etc.
    const status = {
      redis: "connected",
      webserver: "running",
      orchestrator: "active",
      uptime: 14520, // seconds
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching system status:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
