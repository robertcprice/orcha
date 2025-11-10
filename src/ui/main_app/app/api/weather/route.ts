import { NextResponse } from 'next/server';
import { clearWeatherCache, getWeather } from '../../../lib/weather/service';

function parseCoordinate(value: string | null) {
  if (value === null) {
    return null;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric) || !Number.isFinite(numeric)) {
    throw new Error(`Invalid coordinate value: ${value}`);
  }

  return numeric;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const lat = parseCoordinate(url.searchParams.get('lat'));
    const lon = parseCoordinate(url.searchParams.get('lon'));
    const unitsParam = url.searchParams.get('units');
    const refresh = url.searchParams.get('refresh');

    const units = unitsParam === 'imperial' ? 'imperial' : 'metric';

    if (refresh === 'true') {
      clearWeatherCache();
    }

    const payload = await getWeather(lat, lon, units);

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': `public, max-age=${payload.metadata.cacheTtlSeconds}, stale-while-revalidate=60`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error retrieving weather data';
    const status = message.startsWith('Invalid coordinate') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
