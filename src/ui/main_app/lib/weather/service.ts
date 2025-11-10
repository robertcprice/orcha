import { BASELINE_WEATHER, CITY_DEFINITIONS, DEFAULT_CITY_ID, BaselineWeatherProfile } from './data';
import {
  CityDefinition,
  CitySearchResult,
  ForecastDay,
  WeatherAlert,
  WeatherPayload,
  WeatherSnapshot,
} from './types';

const EARTH_RADIUS_KM = 6371;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_LIMIT = 7;

interface WeatherCacheEntry {
  expiresAt: number;
  payload: WeatherPayload;
}

function degToRad(value: number) {
  return (value * Math.PI) / 180;
}

function formatIsoDate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

function applyUnitConversions(snapshot: WeatherSnapshot, units: 'metric' | 'imperial'): WeatherPayload {
  const { current } = snapshot;
  const city = getCityDefinition(snapshot.cityId);
  const convertTemp = (temp: number) => (units === 'metric' ? temp : temp * (9 / 5) + 32);
  const convertPressure = (pressure: number) => (units === 'metric' ? pressure : +(pressure * 0.02953).toFixed(2));
  const convertVisibility = (visibility: number) => (units === 'metric' ? visibility : +(visibility * 0.621371).toFixed(2));
  const convertWind = (wind: number) => (units === 'metric' ? wind : +(wind * 0.621371).toFixed(2));

  return {
    location: {
      name: city?.name ?? 'Unknown',
      country: city?.country ?? 'Unknown',
      latitude: city?.latitude ?? 0,
      longitude: city?.longitude ?? 0,
    },
    units,
    current: {
      temperature: +convertTemp(current.temperatureC).toFixed(1),
      feelsLike: +convertTemp(current.feelsLikeC).toFixed(1),
      description: current.description,
      humidity: current.humidity,
      windSpeed: +convertWind(current.windSpeedKph).toFixed(1),
      pressure: convertPressure(current.pressureMb),
      visibility: convertVisibility(current.visibilityKm),
    },
    forecast: snapshot.forecast.map((day) => ({
      date: day.date,
      minTemp: +convertTemp(day.minTempC).toFixed(1),
      maxTemp: +convertTemp(day.maxTempC).toFixed(1),
      description: day.description,
      precipitationChance: day.precipitationChance,
    })),
    alerts: snapshot.alerts.map((alert) => ({ ...alert })),
    history: snapshot.history.map((point) => ({
      timestamp: point.timestamp,
      temperature: +convertTemp(point.temperatureC).toFixed(1),
    })),
    metadata: {
      cacheTtlSeconds: Math.round(CACHE_TTL_MS / 1000),
      generatedAt: snapshot.generatedAt,
    },
  };
}

function getCityDefinition(cityId: string | null): CityDefinition | undefined {
  if (!cityId) return undefined;
  return CITY_DEFINITIONS.find((city) => city.id === cityId);
}

function haversineDistanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const lat1 = degToRad(a.latitude);
  const lon1 = degToRad(a.longitude);
  const lat2 = degToRad(b.latitude);
  const lon2 = degToRad(b.longitude);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

function scoreCityMatch(query: string, city: CityDefinition) {
  const normalized = query.toLowerCase();
  const name = city.name.toLowerCase();
  const country = city.country.toLowerCase();

  if (name === normalized || `${name}, ${country}` === normalized) {
    return 100;
  }

  if (name.startsWith(normalized)) {
    return 90;
  }

  if (`${name}, ${country}`.startsWith(normalized)) {
    return 85;
  }

  if (name.includes(normalized)) {
    return 70;
  }

  if (country.includes(normalized)) {
    return 40;
  }

  return 0;
}

function synthesizeSnapshot(city: CityDefinition, baseline: BaselineWeatherProfile): WeatherSnapshot {
  const now = Date.now();

  const diurnalOffset = Math.sin((now / (1000 * 60 * 60)) % (2 * Math.PI)) * 0.7;

  const current = {
    temperatureC: +(baseline.current.temperatureC + diurnalOffset).toFixed(1),
    feelsLikeC: +(baseline.current.feelsLikeC + diurnalOffset).toFixed(1),
    humidity: baseline.current.humidity,
    windSpeedKph: Math.max(0, +(baseline.current.windSpeedKph + diurnalOffset * 2).toFixed(1)),
    description: baseline.current.description,
    pressureMb: baseline.current.pressureMb,
    visibilityKm: baseline.current.visibilityKm,
  };

  const forecast: ForecastDay[] = baseline.forecast.map((day, index) => ({
    date: formatIsoDate(index + 1),
    minTempC: +(day.minTempC + diurnalOffset / 2).toFixed(1),
    maxTempC: +(day.maxTempC + diurnalOffset / 2).toFixed(1),
    description: day.description,
    precipitationChance: day.precipitationChance,
  }));

  const history = baseline.history.map((anchor) => ({
    timestamp: now + anchor.dayOffset * 24 * 60 * 60 * 1000,
    temperatureC: +(anchor.temperatureC + diurnalOffset / 3).toFixed(1),
  }));

  const alerts: WeatherAlert[] = baseline.alerts.map((alert) => ({
    ...alert,
    expiresAt: alert.expiresAt ?? now + 6 * 60 * 60 * 1000,
  }));

  return {
    cityId: city.id,
    generatedAt: now,
    current,
    forecast,
    alerts,
    history,
  };
}

export class WeatherService {
  private cache = new Map<string, WeatherCacheEntry>();
  constructor(private ttlMs = CACHE_TTL_MS) {}

  clearCache() {
    this.cache.clear();
  }

  cacheSize() {
    return this.cache.size;
  }

  searchCities(query: string, limit = DEFAULT_LIMIT): CitySearchResult[] {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const matches = CITY_DEFINITIONS
      .map((city) => ({ city, score: scoreCityMatch(trimmed, city) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.city.name.localeCompare(b.city.name))
      .slice(0, limit)
      .map(({ city }) => ({
        id: city.id,
        name: city.name,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
      }));

    if (!matches.length) {
      return CITY_DEFINITIONS.slice(0, limit).map((city) => ({
        id: city.id,
        name: city.name,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
      }));
    }

    return matches;
  }

  async getWeatherByCoordinates(lat: number | null, lon: number | null, units: 'metric' | 'imperial' = 'metric'): Promise<WeatherPayload> {
    const { city, key } = this.resolveCity(lat, lon, units);
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.payload;
    }

    const baseline = BASELINE_WEATHER[city.id];
    if (!baseline) {
      throw new Error(`No weather baseline configured for city ${city.id}`);
    }

    const snapshot = synthesizeSnapshot(city, baseline);
    const payload = applyUnitConversions(snapshot, units);

    this.cache.set(key, {
      expiresAt: now + this.ttlMs,
      payload,
    });

    return payload;
  }

  private resolveCity(lat: number | null, lon: number | null, units: 'metric' | 'imperial') {
    if (lat === null || lon === null) {
      const defaultCity = getCityDefinition(DEFAULT_CITY_ID);
      if (!defaultCity) {
        throw new Error('Default city is not configured');
      }
      return { city: defaultCity, key: `${DEFAULT_CITY_ID}:${units}` };
    }

    if (Math.abs(lat) < 0.0001 && Math.abs(lon) < 0.0001) {
      const defaultCity = getCityDefinition(DEFAULT_CITY_ID);
      if (!defaultCity) {
        throw new Error('Default city is not configured');
      }
      return { city: defaultCity, key: `${DEFAULT_CITY_ID}:${units}` };
    }

    const target = { latitude: lat, longitude: lon };
    let bestCity: CityDefinition | null = null;
    let smallestDistance = Number.POSITIVE_INFINITY;

    for (const city of CITY_DEFINITIONS) {
      const distance = haversineDistanceKm(target, city);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        bestCity = city;
      }
    }

    const resolvedCity = bestCity ?? getCityDefinition(DEFAULT_CITY_ID);
    if (!resolvedCity) {
      throw new Error('Unable to resolve city from coordinates');
    }

    const cacheKey = `${resolvedCity.id}:${units}`;
    return { city: resolvedCity, key: cacheKey };
  }
}

const defaultService = new WeatherService();

export function searchCities(query: string, limit = DEFAULT_LIMIT) {
  return defaultService.searchCities(query, limit);
}

export async function getWeather(lat: number | null, lon: number | null, units: 'metric' | 'imperial' = 'metric') {
  return defaultService.getWeatherByCoordinates(lat, lon, units);
}

export function clearWeatherCache() {
  defaultService.clearCache();
}

export function getWeatherCacheSize() {
  return defaultService.cacheSize();
}
