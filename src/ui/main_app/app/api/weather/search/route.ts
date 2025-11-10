import { NextResponse } from 'next/server';
import { searchCities } from '../../../../lib/weather/service';

const MAX_LIMIT = 15;

function parseLimit(value: string | null) {
  if (!value) return undefined;
  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric <= 0) {
    throw new Error('limit must be a positive number');
  }
  return Math.min(Math.floor(numeric), MAX_LIMIT);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') ?? '';
    const limit = parseLimit(url.searchParams.get('limit'));

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return NextResponse.json({ results: [] });
    }

    const results = searchCities(trimmedQuery, limit);
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search for cities';
    const status = message.includes('limit') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
