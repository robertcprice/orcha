"use client";

import { useEffect, useMemo, useState } from "react";

interface WeatherAlert {
  event: string;
  description: string;
  sender?: string;
}

interface WeatherForecast {
  date: string;
  minTemp: number;
  maxTemp: number;
  description: string;
  precipitationChance: number;
}

interface WeatherHistoryPoint {
  timestamp: number;
  temperature: number;
}

interface WeatherPayload {
  location: {
    name: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  units: "metric" | "imperial";
  current: {
    temperature: number;
    feelsLike: number;
    description: string;
    humidity: number;
    windSpeed: number;
    pressure: number;
    visibility: number;
  };
  forecast: WeatherForecast[];
  alerts: WeatherAlert[];
  history: WeatherHistoryPoint[];
  metadata?: {
    cacheTtlSeconds: number;
    generatedAt: number;
  };
  generatedAt?: string;
}

interface CityResult {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

const WEATHER_ENDPOINT = "/api/weather";
const SEARCH_ENDPOINT = "/api/weather/search";

export default function WeatherDashboardPage() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<CityResult[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load default weather data on first render so charts have content.
    loadWeather();
  }, []);

  const loadWeather = async (city?: CityResult) => {
    try {
      setLoadingWeather(true);
      setError(null);

      const params = city
        ? `?lat=${city.latitude}&lon=${city.longitude}`
        : "?lat=0&lon=0";

      const response = await fetch(`${WEATHER_ENDPOINT}${params}`);
      if (!response.ok) {
        throw new Error(`Weather request failed (${response.status})`);
      }

      const data: WeatherPayload = await response.json();
      setWeather(data);
      if (city) {
        setSelectedCity(city);
      } else {
        // Align selected city with payload
        setSelectedCity({
          id: data.location.name,
          name: data.location.name,
          country: data.location.country,
          latitude: data.location.latitude,
          longitude: data.location.longitude,
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load weather data");
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${SEARCH_ENDPOINT}?q=${encodeURIComponent(value)}`);
      if (!response.ok) {
        throw new Error(`Search request failed (${response.status})`);
      }
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error("Search failed", err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = async (city: CityResult) => {
    setResults([]);
    setQuery(city.name);
    await loadWeather(city);
  };

  const unitLabels = useMemo(() => {
    if (!weather) {
      return {
        temperature: "°",
        wind: "",
        visibility: "",
        pressure: "",
      };
    }

    return {
      temperature: weather.units === "metric" ? "°C" : "°F",
      wind: weather.units === "metric" ? "km/h" : "mph",
      visibility: weather.units === "metric" ? "km" : "mi",
      pressure: weather.units === "metric" ? "mb" : "inHg",
    };
  }, [weather]);

  const feelsLikeText = useMemo(() => {
    if (!weather) return "";
    const value = weather.current.feelsLike;
    return `Feels like ${value.toFixed(1)}${unitLabels.temperature}`;
  }, [weather, unitLabels]);

  const lastUpdated = useMemo(() => {
    const generated =
      weather?.metadata?.generatedAt ??
      (weather?.generatedAt ? Date.parse(weather.generatedAt) : undefined);

    if (!generated || Number.isNaN(generated)) {
      return null;
    }

    return new Date(generated).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [weather]);

  return (
    <main className="min-h-screen bg-[#05070f] text-white px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold" role="heading" aria-level={1}>
            Interactive Weather Intelligence
          </h1>
          <p className="text-sm text-gray-400">
            Live conditions, multi-day forecast, alerts, and historical context for the agents.
          </p>
        </header>

        <section className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-gray-300">Search for a city</span>
            <input
              role="combobox"
              aria-controls="city-results"
              aria-expanded={(query.trim().length > 0) || results.length > 0 || isSearching}
              aria-autocomplete="list"
              aria-label="Search for a city"
              value={query}
              onFocus={() => query && results.length === 0 && handleSearch(query)}
              onChange={(event) => handleSearch(event.target.value)}
              className="px-4 py-3 rounded-md bg-[#0b1020] border border-gray-700 focus:border-cyan-400 focus:outline-none font-mono"
              placeholder="Type a city name..."
            />
          </label>

          {isSearching && (
            <div className="text-xs text-gray-400 font-mono">Searching...</div>
          )}

          {(query.trim().length > 0 || isSearching || results.length > 0) && (
            <ul
              id="city-results"
              role="listbox"
              aria-busy={isSearching}
              className="bg-[#0d1428] border border-gray-800 rounded-md divide-y divide-gray-800"
            >
              {isSearching && (
                <li className="px-4 py-3 text-xs text-gray-400 font-mono">
                  Searching…
                </li>
              )}
              {!isSearching && results.length === 0 && (
                <li
                  role="option"
                  aria-disabled="true"
                  className="px-4 py-3 text-xs text-gray-500 font-mono italic"
                >
                  No matches found
                </li>
              )}
              {results.map((city) => (
                <li
                  key={city.id}
                  role="option"
                  onClick={() => handleSelect(city)}
                  className="px-4 py-3 cursor-pointer hover:bg-cyan-500/10 transition-colors font-mono text-sm"
                >
                  {city.name}, {city.country}
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 font-mono">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-800 bg-[#0b1020] p-5 space-y-4">
            <h2 className="text-lg font-semibold">Current Conditions</h2>
            {loadingWeather ? (
              <div className="text-sm text-gray-400">Loading weather...</div>
            ) : weather ? (
              <div className="space-y-2 font-mono text-sm">
                <div className="text-2xl font-bold">
                  {selectedCity?.name || weather.location.name}
                </div>
                <div className="text-gray-300 capitalize">{weather.current.description}</div>
                <div className="text-gray-200">
                  Temperature: {weather.current.temperature.toFixed(1)}
                  {weather.units === "metric" ? "°C" : "°F"}
                </div>
                <div className="text-cyan-300 font-semibold">{feelsLikeText}</div>
                <div className="text-gray-400">Humidity: {weather.current.humidity}%</div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-800/60">
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Wind</div>
                    <div className="text-gray-200">
                      {weather.current.windSpeed.toFixed(1)} {unitLabels.wind}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Pressure</div>
                    <div className="text-gray-200">
                      {weather.current.pressure}
                      {unitLabels.pressure && ` ${unitLabels.pressure}`}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Visibility</div>
                    <div className="text-gray-200">
                      {weather.current.visibility.toFixed(1)} {unitLabels.visibility}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Updated</div>
                    <div className="text-gray-200">{lastUpdated || "Just now"}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400">No weather data available.</div>
            )}
          </div>

          <div className="rounded-xl border border-gray-800 bg-[#0b1020] p-5 space-y-3">
            <h2 className="text-lg font-semibold">Weather Alerts</h2>
            {weather?.alerts?.length ? (
              <ul className="space-y-2 text-sm text-gray-200">
                {weather.alerts.map((alert, index) => (
                  <li key={index} className="rounded border border-yellow-500/30 bg-yellow-500/10 p-3">
                    <div className="font-semibold text-yellow-200">{alert.event}</div>
                    <div className="text-xs text-yellow-100/80">{alert.description}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-400">No active alerts.</div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-800 bg-[#0b1020] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Extended Forecast</h2>
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              {weather?.forecast?.length ? `${weather.forecast.length}-day outlook` : "Awaiting data"}
            </span>
          </div>
          {weather?.forecast?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-mono text-sm">
              {weather.forecast.slice(0, 5).map((day) => (
                <div
                  key={day.date}
                  className="rounded-lg border border-gray-800 bg-[#101830] p-3 space-y-2"
                >
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    {new Date(day.date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-gray-200 capitalize">{day.description}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-cyan-300">
                      {day.maxTemp.toFixed(1)}{unitLabels.temperature}
                    </span>
                    <span className="text-gray-500">
                      / {day.minTemp.toFixed(1)}{unitLabels.temperature}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Precipitation chance: {day.precipitationChance}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              Forecast data will populate once an agent selects a city.
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-800 bg-[#0b1020] p-5 space-y-3">
          <h2 className="text-lg font-semibold">Historical Trends</h2>
          {weather?.history?.length ? (
            <div className="space-y-2 text-sm text-gray-300 font-mono">
              {weather.history.slice(-5).map((point, index) => (
                <div key={index} className="flex justify-between">
                  <span>{new Date(point.timestamp).toLocaleDateString()}</span>
                  <span>
                    {point.temperature.toFixed(1)}
                    {unitLabels.temperature}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              Historical data will appear once the orchestrator collects a timeline.
            </div>
          )}
        </section>

        {weather && (
          <footer className="text-xs text-gray-500 font-mono text-right">
            Simulated feed updated every {(weather.metadata?.cacheTtlSeconds ?? 60)}s • Source: local climate baselines
          </footer>
        )}
      </div>
    </main>
  );
}
