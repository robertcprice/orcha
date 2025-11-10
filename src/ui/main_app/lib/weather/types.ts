export interface CityDefinition {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population: number;
  region: string;
  climate: 'temperate' | 'tropical' | 'arid' | 'continental' | 'polar' | 'mediterranean';
}

export interface WeatherAlert {
  event: string;
  description: string;
  sender?: string;
  expiresAt?: number;
}

export interface ForecastDay {
  date: string;
  minTempC: number;
  maxTempC: number;
  description: string;
  precipitationChance: number;
}

export interface HistoricalPoint {
  timestamp: number;
  temperatureC: number;
}

export interface WeatherSnapshot {
  cityId: string;
  generatedAt: number;
  current: {
    temperatureC: number;
    feelsLikeC: number;
    humidity: number;
    windSpeedKph: number;
    description: string;
    pressureMb: number;
    visibilityKm: number;
  };
  forecast: ForecastDay[];
  alerts: WeatherAlert[];
  history: HistoricalPoint[];
}

export interface WeatherPayload {
  location: {
    name: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  units: 'metric' | 'imperial';
  current: {
    temperature: number;
    feelsLike: number;
    description: string;
    humidity: number;
    windSpeed: number;
    pressure: number;
    visibility: number;
  };
  forecast: Array<{
    date: string;
    minTemp: number;
    maxTemp: number;
    description: string;
    precipitationChance: number;
  }>;
  alerts: WeatherAlert[];
  history: Array<{
    timestamp: number;
    temperature: number;
  }>;
  metadata: {
    cacheTtlSeconds: number;
    generatedAt: number;
  };
}

export interface CitySearchResult {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}
