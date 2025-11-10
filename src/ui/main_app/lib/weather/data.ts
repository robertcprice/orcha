import { CityDefinition, WeatherAlert, ForecastDay } from './types';

export interface HistoricalAnchor {
  dayOffset: number;
  temperatureC: number;
}

export interface BaselineWeatherProfile {
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
  history: HistoricalAnchor[];
}

export const CITY_DEFINITIONS: CityDefinition[] = [
  {
    id: 'san-francisco',
    name: 'San Francisco',
    country: 'USA',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
    population: 873965,
    region: 'North America',
    climate: 'mediterranean',
  },
  {
    id: 'new-york',
    name: 'New York',
    country: 'USA',
    latitude: 40.7128,
    longitude: -74.006,
    timezone: 'America/New_York',
    population: 8419600,
    region: 'North America',
    climate: 'temperate',
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    latitude: 51.5072,
    longitude: -0.1276,
    timezone: 'Europe/London',
    population: 8982000,
    region: 'Europe',
    climate: 'temperate',
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: 'Asia/Tokyo',
    population: 13929286,
    region: 'Asia',
    climate: 'continental',
  },
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: 'Australia/Sydney',
    population: 5312163,
    region: 'Oceania',
    climate: 'temperate',
  },
  {
    id: 'cairo',
    name: 'Cairo',
    country: 'Egypt',
    latitude: 30.0444,
    longitude: 31.2357,
    timezone: 'Africa/Cairo',
    population: 9900000,
    region: 'Africa',
    climate: 'arid',
  },
  {
    id: 'reykjavik',
    name: 'Reykjavík',
    country: 'Iceland',
    latitude: 64.1466,
    longitude: -21.9426,
    timezone: 'Atlantic/Reykjavik',
    population: 135688,
    region: 'Europe',
    climate: 'polar',
  },
];

export const DEFAULT_CITY_ID = 'san-francisco';

export const BASELINE_WEATHER: Record<string, BaselineWeatherProfile> = {
  'san-francisco': {
    current: {
      temperatureC: 18.4,
      feelsLikeC: 18.0,
      humidity: 72,
      windSpeedKph: 14,
      description: 'coastal fog with sun breaks',
      pressureMb: 1016,
      visibilityKm: 9,
    },
    forecast: [
      { date: '2024-10-01', minTempC: 14, maxTempC: 19, description: 'foggy morning, sunny afternoon', precipitationChance: 20 },
      { date: '2024-10-02', minTempC: 13, maxTempC: 18, description: 'low clouds, breezy', precipitationChance: 10 },
      { date: '2024-10-03', minTempC: 13, maxTempC: 20, description: 'sunny intervals', precipitationChance: 5 },
      { date: '2024-10-04', minTempC: 12, maxTempC: 21, description: 'clear and mild', precipitationChance: 2 },
      { date: '2024-10-05', minTempC: 13, maxTempC: 19, description: 'morning fog returning', precipitationChance: 15 },
    ],
    alerts: [],
    history: [
      { dayOffset: -6, temperatureC: 17.2 },
      { dayOffset: -5, temperatureC: 17.8 },
      { dayOffset: -4, temperatureC: 18.1 },
      { dayOffset: -3, temperatureC: 18.9 },
      { dayOffset: -2, temperatureC: 18.4 },
      { dayOffset: -1, temperatureC: 17.5 },
      { dayOffset: 0, temperatureC: 18.4 },
    ],
  },
  'new-york': {
    current: {
      temperatureC: 24.2,
      feelsLikeC: 25.1,
      humidity: 68,
      windSpeedKph: 11,
      description: 'warm with scattered clouds',
      pressureMb: 1012,
      visibilityKm: 12,
    },
    forecast: [
      { date: '2024-10-01', minTempC: 20, maxTempC: 26, description: 'partly cloudy', precipitationChance: 25 },
      { date: '2024-10-02', minTempC: 21, maxTempC: 27, description: 'humid with showers', precipitationChance: 40 },
      { date: '2024-10-03', minTempC: 19, maxTempC: 24, description: 'clearing skies', precipitationChance: 15 },
      { date: '2024-10-04', minTempC: 18, maxTempC: 23, description: 'breezy and sunny', precipitationChance: 5 },
      { date: '2024-10-05', minTempC: 17, maxTempC: 22, description: 'cooler with clouds', precipitationChance: 20 },
    ],
    alerts: [
      {
        event: 'Air Quality Advisory',
        description: 'Elevated ozone levels expected in the afternoon. Sensitive groups should limit outdoor activity.',
        sender: 'NYC Department of Environmental Protection',
      },
    ],
    history: [
      { dayOffset: -6, temperatureC: 25.1 },
      { dayOffset: -5, temperatureC: 24.8 },
      { dayOffset: -4, temperatureC: 26.2 },
      { dayOffset: -3, temperatureC: 27.4 },
      { dayOffset: -2, temperatureC: 26.5 },
      { dayOffset: -1, temperatureC: 24.3 },
      { dayOffset: 0, temperatureC: 24.2 },
    ],
  },
  london: {
    current: {
      temperatureC: 16.3,
      feelsLikeC: 15.9,
      humidity: 78,
      windSpeedKph: 17,
      description: 'light showers with gusty winds',
      pressureMb: 1008,
      visibilityKm: 7,
    },
    forecast: [
      { date: '2024-10-01', minTempC: 13, maxTempC: 17, description: 'grey with light rain', precipitationChance: 55 },
      { date: '2024-10-02', minTempC: 12, maxTempC: 18, description: 'clouds breaking late', precipitationChance: 35 },
      { date: '2024-10-03', minTempC: 11, maxTempC: 19, description: 'sunny spells', precipitationChance: 20 },
      { date: '2024-10-04', minTempC: 10, maxTempC: 18, description: 'cool and breezy', precipitationChance: 10 },
      { date: '2024-10-05', minTempC: 11, maxTempC: 17, description: 'returning showers', precipitationChance: 45 },
    ],
    alerts: [],
    history: [
      { dayOffset: -6, temperatureC: 14.8 },
      { dayOffset: -5, temperatureC: 15.2 },
      { dayOffset: -4, temperatureC: 16.1 },
      { dayOffset: -3, temperatureC: 16.9 },
      { dayOffset: -2, temperatureC: 16.2 },
      { dayOffset: -1, temperatureC: 15.6 },
      { dayOffset: 0, temperatureC: 16.3 },
    ],
  },
  tokyo: {
    current: {
      temperatureC: 27.9,
      feelsLikeC: 30.2,
      humidity: 74,
      windSpeedKph: 9,
      description: 'humid with late-day storms',
      pressureMb: 1006,
      visibilityKm: 14,
    },
    forecast: [
      { date: '2024-10-01', minTempC: 24, maxTempC: 30, description: 'isolated thunderstorms', precipitationChance: 45 },
      { date: '2024-10-02', minTempC: 23, maxTempC: 31, description: 'hot and humid', precipitationChance: 35 },
      { date: '2024-10-03', minTempC: 22, maxTempC: 29, description: 'partly sunny', precipitationChance: 20 },
      { date: '2024-10-04', minTempC: 21, maxTempC: 28, description: 'scattered showers', precipitationChance: 40 },
      { date: '2024-10-05', minTempC: 20, maxTempC: 27, description: 'turning cooler', precipitationChance: 30 },
    ],
    alerts: [
      {
        event: 'Heat Advisory',
        description: 'Heat index values near 35°C. Stay hydrated and avoid strenuous activity during midday hours.',
        sender: 'Japan Meteorological Agency',
      },
    ],
    history: [
      { dayOffset: -6, temperatureC: 28.4 },
      { dayOffset: -5, temperatureC: 29.1 },
      { dayOffset: -4, temperatureC: 30.3 },
      { dayOffset: -3, temperatureC: 31.1 },
      { dayOffset: -2, temperatureC: 30.7 },
      { dayOffset: -1, temperatureC: 28.9 },
      { dayOffset: 0, temperatureC: 27.9 },
    ],
  },
  sydney: {
    current: {
      temperatureC: 21.5,
      feelsLikeC: 21.2,
      humidity: 62,
      windSpeedKph: 19,
      description: 'mild with ocean breeze',
      pressureMb: 1018,
      visibilityKm: 16,
    },
    forecast: [
      { date: '2024-10-01', minTempC: 17, maxTempC: 23, description: 'sunny and breezy', precipitationChance: 5 },
      { date: '2024-10-02', minTempC: 16, maxTempC: 22, description: 'morning clouds clearing', precipitationChance: 10 },
      { date: '2024-10-03', minTempC: 15, maxTempC: 24, description: 'warmer with sun', precipitationChance: 5 },
      { date: '2024-10-04', minTempC: 16, maxTempC: 25, description: 'sunny and pleasant', precipitationChance: 2 },
      { date: '2024-10-05', minTempC: 17, maxTempC: 24, description: 'showers late', precipitationChance: 20 },
    ],
    alerts: [],
    history: [
      { dayOffset: -6, temperatureC: 19.5 },
      { dayOffset: -5, temperatureC: 20.1 },
      { dayOffset: -4, temperatureC: 20.8 },
      { dayOffset: -3, temperatureC: 21.7 },
      { dayOffset: -2, temperatureC: 21.2 },
      { dayOffset: -1, temperatureC: 20.9 },
      { dayOffset: 0, temperatureC: 21.5 },
    ],
  },
  cairo: {
    current: {
      temperatureC: 33.8,
      feelsLikeC: 32.5,
      humidity: 28,
      windSpeedKph: 22,
      description: 'dry heat with haze',
      pressureMb: 1004,
      visibilityKm: 10,
    },
    forecast: [
      { date: '2024-10-01', minTempC: 26, maxTempC: 35, description: 'sunny and hot', precipitationChance: 0 },
      { date: '2024-10-02', minTempC: 27, maxTempC: 36, description: 'hot with haze', precipitationChance: 0 },
      { date: '2024-10-03', minTempC: 26, maxTempC: 35, description: 'breezy sunshine', precipitationChance: 0 },
      { date: '2024-10-04', minTempC: 25, maxTempC: 34, description: 'sunny and dry', precipitationChance: 0 },
      { date: '2024-10-05', minTempC: 24, maxTempC: 33, description: 'slightly cooler', precipitationChance: 0 },
    ],
    alerts: [
      {
        event: 'Blowing Dust Advisory',
        description: 'Gusty winds may reduce visibility to below 2 km at times this afternoon.',
        sender: 'Egyptian Meteorological Authority',
      },
    ],
    history: [
      { dayOffset: -6, temperatureC: 34.1 },
      { dayOffset: -5, temperatureC: 34.8 },
      { dayOffset: -4, temperatureC: 35.5 },
      { dayOffset: -3, temperatureC: 36.3 },
      { dayOffset: -2, temperatureC: 35.0 },
      { dayOffset: -1, temperatureC: 34.4 },
      { dayOffset: 0, temperatureC: 33.8 },
    ],
  },
  reykjavik: {
    current: {
      temperatureC: 6.4,
      feelsLikeC: 3.7,
      humidity: 82,
      windSpeedKph: 28,
      description: 'brisk winds with light drizzle',
      pressureMb: 1002,
      visibilityKm: 6,
    },
    forecast: [
      { date: '2024-10-01', minTempC: 3, maxTempC: 7, description: 'cloudy with drizzle', precipitationChance: 60 },
      { date: '2024-10-02', minTempC: 2, maxTempC: 6, description: 'gusty showers', precipitationChance: 55 },
      { date: '2024-10-03', minTempC: 1, maxTempC: 5, description: 'mixed rain and snow', precipitationChance: 50 },
      { date: '2024-10-04', minTempC: 0, maxTempC: 4, description: 'cold and windy', precipitationChance: 40 },
      { date: '2024-10-05', minTempC: 0, maxTempC: 5, description: 'clouds with sun breaks', precipitationChance: 35 },
    ],
    alerts: [
      {
        event: 'Gale Warning',
        description: 'Northwesterly winds 60-70 km/h expected through evening. Secure loose objects.',
        sender: 'Icelandic Met Office',
      },
    ],
    history: [
      { dayOffset: -6, temperatureC: 7.1 },
      { dayOffset: -5, temperatureC: 6.5 },
      { dayOffset: -4, temperatureC: 6.1 },
      { dayOffset: -3, temperatureC: 5.6 },
      { dayOffset: -2, temperatureC: 5.1 },
      { dayOffset: -1, temperatureC: 6.0 },
      { dayOffset: 0, temperatureC: 6.4 },
    ],
  },
};

export function findCityById(id: string) {
  return CITY_DEFINITIONS.find((city) => city.id === id);
}
