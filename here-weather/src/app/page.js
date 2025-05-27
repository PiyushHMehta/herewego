"use client";
import { useState, useEffect } from "react";

const API_KEY = process.env.NEXT_PUBLIC_HERE_API_KEY;

function formatDate(dateStr) {
  // HERE API returns date as YYYY-MM-DD
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function getTemperature(f) {
  // Try to extract temperature from various possible fields
  if (typeof f.temperature === "number") return f.temperature;
  if (f.temperature && typeof f.temperature.value === "number") return f.temperature.value;
  if (typeof f.highTemperature === "number") return f.highTemperature;
  if (typeof f.lowTemperature === "number") return f.lowTemperature;
  if (typeof f.temperatureDesc === "string" && f.temperatureDesc) return f.temperatureDesc;
  return null;
}

export default function WeatherApp() {
  // Get location from query param if present
  function getLocationFromQuery() {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("location") || "";
  }

  const [location, setLocation] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Prefill location from query param on mount
  useEffect(() => {
    const loc = getLocationFromQuery();
    if (loc) setLocation(loc);
  }, []);

  const fetchWeather = async (e) => {
    e && e.preventDefault();
    setError("");
    setWeather(null);
    setForecast([]);
    if (!location) {
      setError("Please enter a location.");
      return;
    }
    setLoading(true);
    try {
      // Geocode location to get lat/lon
      const geoRes = await fetch(
        `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(
          location
        )}&apiKey=${API_KEY}`
      );
      const geoData = await geoRes.json();
      if (!geoData.items || geoData.items.length === 0) {
        setError("Location not found.");
        setLoading(false);
        return;
      }
      const { lat, lng } = geoData.items[0].position;

      // Fetch weather data
      const weatherRes = await fetch(
        `https://weather.ls.hereapi.com/weather/1.0/report.json?product=forecast_7days_simple&latitude=${lat}&longitude=${lng}&apiKey=${API_KEY}`
      );
      const weatherData = await weatherRes.json();
      if (!weatherData.dailyForecasts || !weatherData.dailyForecasts.forecastLocation) {
        setError("Weather data not available.");
        setLoading(false);
        return;
      }
      const current = weatherData.dailyForecasts.forecastLocation;
      let forecasts = current.forecast.map((f) => ({
        ...f,
        date: f.utcTime || f.date,
        temperature: getTemperature(f),
        description: f.description,
      }));
      console.log('Forecasts:', forecasts); // Debug log
      // Set start and end date defaults if not set
      if (!startDate) setStartDate(forecasts[0].date);
      if (!endDate) setEndDate(forecasts[forecasts.length - 1].date);
      // Filter by date range
      let filtered = forecasts.filter((f) => {
        if (startDate && f.date < startDate) return false;
        if (endDate && f.date > endDate) return false;
        return true;
      });
      setWeather({
        city: current.city,
        country: current.country,
        today: forecasts[0],
      });
      setForecast(filtered.slice(1)); // Exclude today from forecast
    } catch (err) {
      setError("Failed to fetch weather data.");
    }
    setLoading(false);
  };

  // Ensure date pickers use YYYY-MM-DD
  function toInputDate(dateStr) {
    if (!dateStr) return "";
    // If already in YYYY-MM-DD, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Try to parse and format
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 10);
  }

  return (
    <div className="weather-container">
      <div className="mb-4 text-center">
        <a
          href="http://127.0.0.1:5500/temp/route-form.html"
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded transition"
        >
          Plan a Route
        </a>
      </div>
      <h1 className="weather-title">Weather App</h1>
      <form className="weather-form" onSubmit={fetchWeather}>
        <input
          className="weather-input"
          type="text"
          placeholder="Enter city name..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button className="weather-button" type="submit" disabled={loading}>
          {loading ? "Loading..." : "Get Weather"}
        </button>
      </form>
      {forecast.length > 0 && (
        <div className="flex gap-2 mb-4 justify-center">
          <div>
            <label className="mr-1 font-semibold">Start:</label>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={toInputDate(startDate)}
              min={toInputDate(forecast[0].date)}
              max={toInputDate(endDate)}
              onChange={(e) => setStartDate(e.target.value)}
              onBlur={fetchWeather}
            />
          </div>
          <div>
            <label className="mr-1 font-semibold">End:</label>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={toInputDate(endDate)}
              min={toInputDate(startDate)}
              max={toInputDate(forecast[forecast.length - 1].date)}
              onChange={(e) => setEndDate(e.target.value)}
              onBlur={fetchWeather}
            />
          </div>
        </div>
      )}
      {error && <div className="weather-error">{error}</div>}
      {weather && (
        <div className="weather-current">
          <div className="text-xl font-semibold mb-2">
            {weather.city}, {weather.country}
          </div>
          <div className="weather-temp">
            {weather.today.temperature !== null && weather.today.temperature !== undefined
              ? (typeof weather.today.temperature === "number"
                  ? `${weather.today.temperature}°C`
                  : weather.today.temperature)
              : "N/A"}
          </div>
          <div className="weather-desc">
            {weather.today.description}
          </div>
          <div className="text-gray-500 text-sm mt-1">
            {weather.today.date ? formatDate(weather.today.date) : null}
          </div>
        </div>
      )}
      {forecast.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-2 text-blue-700 text-center">Forecast</h2>
          <div className="weather-forecast">
            {forecast.map((day, idx) => (
              <div className="weather-day" key={idx}>
                <div className="font-semibold mb-1">{day.date ? formatDate(day.date) : day.weekday}</div>
                <div className="weather-day-temp">
                  {day.temperature !== null && day.temperature !== undefined
                    ? (typeof day.temperature === "number"
                        ? `${day.temperature}°C`
                        : day.temperature)
                    : "N/A"}
                </div>
                <div className="weather-day-desc">{day.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
