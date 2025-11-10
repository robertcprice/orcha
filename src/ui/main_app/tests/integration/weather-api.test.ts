import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as weatherGet } from '../../app/api/weather/route';
import { GET as searchGet } from '../../app/api/weather/search/route';
import { clearWeatherCache } from '../../lib/weather/service';

test.beforeEach(() => {
  clearWeatherCache();
});

test('GET /api/weather returns a valid payload', async () => {
  const request = new Request('http://localhost/api/weather?lat=0&lon=0');
  const response = await weatherGet(request);

  assert.equal(response.status, 200);
  const payload = await response.json();

  assert.equal(payload.location.name, 'San Francisco');
  assert.equal(payload.units, 'metric');
  assert.ok(Array.isArray(payload.forecast));
  assert.ok(payload.forecast.length > 0, 'forecast should not be empty');
});

test('GET /api/weather rejects invalid coordinates', async () => {
  const request = new Request('http://localhost/api/weather?lat=foo&lon=bar');
  const response = await weatherGet(request);

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.ok(payload.error.includes('Invalid coordinate'));
});

test('GET /api/weather/search returns city matches', async () => {
  const request = new Request('http://localhost/api/weather/search?q=Lon');
  const response = await searchGet(request);

  assert.equal(response.status, 200);
  const payload = await response.json();

  assert.ok(Array.isArray(payload.results));
  assert.ok(payload.results.some((city: any) => city.name === 'London'));
});

test('GET /api/weather/search handles empty queries', async () => {
  const request = new Request('http://localhost/api/weather/search?q=   ');
  const response = await searchGet(request);

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.results.length, 0);
});
