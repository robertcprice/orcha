import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearWeatherCache,
  getWeather,
  getWeatherCacheSize,
  searchCities,
} from '../../lib/weather/service';

test.beforeEach(() => {
  clearWeatherCache();
});

test('searchCities returns ranked matches for prefix queries', () => {
  const results = searchCities('San');
  assert.ok(results.length > 0, 'expected at least one result');
  assert.equal(results[0]?.name, 'San Francisco');
});

test('searchCities falls back to curated defaults when no matches', () => {
  const results = searchCities('Atlantis');
  assert.ok(results.length > 0, 'fallback results should be provided');
});

test('getWeather returns default city when coordinates are null', async () => {
  const payload = await getWeather(null, null, 'metric');
  assert.equal(payload.location.name, 'San Francisco');
  assert.equal(payload.units, 'metric');
  assert.ok(payload.current.temperature, 'temperature should be provided');
});

test('getWeather resolves nearest city by coordinates', async () => {
  const payload = await getWeather(35.6762, 139.6503, 'metric');
  assert.equal(payload.location.name, 'Tokyo');
});

test('getWeather converts measurements for imperial units', async () => {
  const metric = await getWeather(null, null, 'metric');
  const imperial = await getWeather(null, null, 'imperial');

  const expectedTempF = metric.current.temperature * (9 / 5) + 32;
  const expectedWindMph = metric.current.windSpeed * 0.621371;
  const expectedVisibilityMiles = metric.current.visibility * 0.621371;

  assert.equal(imperial.units, 'imperial');
  assert.ok(Math.abs(imperial.current.temperature - expectedTempF) < 1.1);
  assert.ok(Math.abs(imperial.current.windSpeed - expectedWindMph) < 0.8);
  assert.ok(Math.abs(imperial.current.visibility - expectedVisibilityMiles) < 0.8);
});

test('getWeather caches repeated requests for the same coordinates and units', async () => {
  const first = await getWeather(null, null, 'metric');
  const cacheSizeAfterFirst = getWeatherCacheSize();
  const second = await getWeather(null, null, 'metric');
  const cacheSizeAfterSecond = getWeatherCacheSize();

  assert.equal(cacheSizeAfterFirst, 1);
  assert.equal(cacheSizeAfterSecond, 1);
  assert.strictEqual(first, second);
});
