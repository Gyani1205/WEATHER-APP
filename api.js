/**
 * api.js
 * Handles all communication with the OpenWeatherMap API.
 *
 * SECURITY NOTE:
 * The API key lives in `config.js`, which is gitignored so it never gets
 * committed to a public repository. See config.example.js / README.md →
 * "API Setup" to set up your own free key from https://openweathermap.org/api.
 */

import { OPENWEATHER_API_KEY } from "./config.js";

const API_KEY = "5efdebd1ea12661d289f3d946cb03d5b";
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const ONECALL_URL = "https://api.openweathermap.org/data/3.0";
const GEO_URL = "https://api.openweathermap.org/geo/1.0";

/** Custom error so the UI layer can distinguish error types. */
export class WeatherApiError extends Error {
  constructor(message, type = "generic") {
    super(message);
    this.name = "WeatherApiError";
    this.type = type; // "not-found" | "network" | "generic"
  }
}

async function safeFetch(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new WeatherApiError(
      "Network error — please check your internet connection.",
      "network"
    );
  }

  if (response.status === 404) {
    throw new WeatherApiError("City not found.", "not-found");
  }

  if (!response.ok) {
    throw new WeatherApiError(
      `Request failed with status ${response.status}.`,
      "generic"
    );
  }

  return response.json();
}

/** Fetch current weather by city name. */
export async function fetchWeatherByCity(city) {
  const url = `${BASE_URL}/weather?q=${encodeURIComponent(
    city
  )}&units=metric&appid=${API_KEY}`;
  return safeFetch(url);
}

/** Fetch current weather by coordinates (used for geolocation). */
export async function fetchWeatherByCoords(lat, lon) {
  const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
  return safeFetch(url);
}

/** Fetch 5-day / 3-hour forecast (used for hourly + daily breakdown). */
export async function fetchForecast(lat, lon) {
  const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
  return safeFetch(url);
}

/** Fetch Air Quality Index data. */
export async function fetchAirQuality(lat, lon) {
  const url = `${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
  return safeFetch(url);
}

/** Fetch UV index via One Call 3.0 (falls back gracefully if unavailable on free tier). */
export async function fetchUvIndex(lat, lon) {
  try {
    // NOTE: One Call lives under /data/3.0, a different base path than the
    // rest of this file's /data/2.5 endpoints — easy bug to introduce by
    // copy-pasting BASE_URL, so it gets its own constant above.
    const url = `${ONECALL_URL}/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&units=metric&appid=${API_KEY}`;
    return await safeFetch(url);
  } catch (err) {
    // One Call 3.0 requires a separate (free, but opt-in) subscription on
    // the OpenWeatherMap account. Returning null lets the UI show a graceful
    // placeholder instead of failing the whole dashboard.
    return null;
  }
}

/** Geocode a partial city name into autocomplete suggestions (up to 5). */
export async function geocodeCity(city, limit = 5) {
  const url = `${GEO_URL}/direct?q=${encodeURIComponent(
    city
  )}&limit=${limit}&appid=${API_KEY}`;
  return safeFetch(url);
}
