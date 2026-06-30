/**
 * main.js
 * App entry point: wires together api.js, ui.js, and storage.js.
 */

import {
  fetchWeatherByCity,
  fetchWeatherByCoords,
  fetchForecast,
  fetchAirQuality,
  fetchUvIndex,
  WeatherApiError,
} from "./api.js";

import {
  els,
  showLoading,
  showError,
  showDashboard,
  renderCurrentWeather,
  renderUv,
  renderAqi,
  renderHourly,
  renderDaily,
  renderHistory,
  attachRipple,
} from "./ui.js";

import {
  getStoredTheme,
  setStoredTheme,
  getHistory,
  addToHistory,
} from "./storage.js";
const CACHE_TIME = 10 * 60 * 1000;
/* ---------------- Theme ---------------- */

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const toggle = document.getElementById("theme-toggle");
  toggle.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
  toggle.setAttribute(
    "aria-label",
    theme === "light" ? "Switch to dark mode" : "Switch to light mode"
  );
}

function initTheme() {
  const stored = getStoredTheme();
  const prefersLight =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches;
  const theme = stored || (prefersLight ? "light" : "dark");
  applyTheme(theme);

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";
    applyTheme(next);
    setStoredTheme(next);
  });
}

/* ---------------- Core weather loading ---------------- */

let currentRequestId = 0;
let lastRequestParams = null;

async function loadWeather({ city, lat, lon }) {
  const requestId = ++currentRequestId;
  lastRequestParams = { city, lat, lon };

  showLoading();

  const cacheKey = city
    ? `weather-${city.toLowerCase()}`
    : `weather-${lat}-${lon}`;

  const cached = getCache(cacheKey);

  if (cached) {
    renderCurrentWeather(cached.weather);
    renderHourly(cached.forecast);
    renderDaily(cached.forecast);
    renderAqi(cached.aqi);
    renderUv(cached.uv);
    showDashboard();

    const history = addToHistory(cached.weather.name);
    renderHistory(history, (selectedCity) =>
      loadWeather({ city: selectedCity })
    );

    return;
  }

  try {
    const weatherData = city
      ? await fetchWeatherByCity(city)
      : await fetchWeatherByCoords(lat, lon);

    if (requestId !== currentRequestId) return;

    // Display current weather immediately
    renderCurrentWeather(weatherData);
    showDashboard();

    const { coord } = weatherData;

    const [forecastData, aqiData, uvData] = await Promise.all([
      fetchForecast(coord.lat, coord.lon),
      fetchAirQuality(coord.lat, coord.lon).catch(() => null),
      fetchUvIndex(coord.lat, coord.lon).catch(() => null),
    ]);

    if (requestId !== currentRequestId) return;

    renderHourly(forecastData);
    renderDaily(forecastData);
    renderAqi(aqiData);
    renderUv(uvData);

    setCache(cacheKey, {
      weather: weatherData,
      forecast: forecastData,
      aqi: aqiData,
      uv: uvData,
    });

    const history = addToHistory(weatherData.name);
    renderHistory(history, (selectedCity) =>
      loadWeather({ city: selectedCity })
    );
  } catch (err) {
    if (requestId !== currentRequestId) return;

    if (err instanceof WeatherApiError) {
      showError(err.type, city);
    } else {
      showError("generic", city);
    }

    console.error(err);
  }
}

/* ---------------- Search ---------------- */

function handleSearchSubmit(e) {
  e.preventDefault();

  const city = els.cityInput.value.trim();

  if (!city) {
    if (els.searchError) {
      els.searchError.textContent = "Please enter a city name.";
    }
    els.cityInput.focus();
    return;
  }

  if (els.searchError) {
    els.searchError.textContent = "";
  }

  loadWeather({ city });
}
/* ---------------- Geolocation ---------------- */

function handleLocate() {
  if (!("geolocation" in navigator)) {
    showError("geolocation");
    return;
  }

  els.locateBtn.classList.add("is-loading");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      els.locateBtn.classList.remove("is-loading");
      const { latitude, longitude } = position.coords;
      loadWeather({ lat: latitude, lon: longitude });
    },
    () => {
      els.locateBtn.classList.remove("is-loading");
      showError("geolocation");
    },
    { timeout: 10000 }
  );
}

/* ---------------- Init ---------------- */

function init() {
  initTheme();
  document.getElementById("year").textContent = new Date().getFullYear();

  const form = document.getElementById("search-form");
  form.addEventListener("submit", handleSearchSubmit);

  // Debounced autocomplete suggestions as the user types.

  els.locateBtn.addEventListener("click", handleLocate);

  if (els.retryBtn) {
    els.retryBtn.addEventListener("click", () => {
      if (lastRequestParams) loadWeather(lastRequestParams);
    });
    attachRipple(els.retryBtn);
  }

  attachRipple(document.querySelector(".search-submit"));

  const history = getHistory();
  renderHistory(history, (city) => loadWeather({ city }));

  // Initial load: try geolocation first, gracefully fall back to a default city.
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        loadWeather({ lat: latitude, lon: longitude });
      },
      () => {
        loadWeather({ city: history[0] || "London" });
      },
      { timeout: 8000 }
    );
  } else {
    loadWeather({ city: history[0] || "London" });
  }
}

document.addEventListener("DOMContentLoaded", init);
function getCache(key) {
  const data = localStorage.getItem(key);
  if (!data) return null;

  const parsed = JSON.parse(data);

  if (Date.now() - parsed.time > CACHE_TIME) {
    localStorage.removeItem(key);
    return null;
  }

  return parsed.data;
}

function setCache(key, data) {
  localStorage.setItem(
    key,
    JSON.stringify({
      time: Date.now(),
      data,
    })
  );
}