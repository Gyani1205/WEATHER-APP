/**
 * ui.js
 * Pure-ish DOM rendering helpers. Each function takes data and updates the
 * relevant part of the page. No fetch calls live here — see api.js.
 */

const $ = (selector) => document.querySelector(selector);

/** Escapes text before it's interpolated into innerHTML templates. */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

export const els = {
  spinner: $("#spinner"),
  skeleton: $("#skeleton"),
  errorState: $("#error-state"),
  errorTitle: $("#error-title"),
  errorMessage: $("#error-message"),
  dashboard: $("#dashboard"),
  searchError: $("#search-error"),

  cityName: $("#city-name"),
  dateTime: $("#date-time"),
  lastUpdated: $("#last-updated"),
  weatherIcon: $("#weather-icon"),
  tempValue: $("#temp-value"),
  tempUnit: $("#temp-unit"),
  weatherDesc: $("#weather-desc"),
  feelsLike: $("#feels-like"),
  country: $("#country"),
  sunriseTime: $("#sunrise-time"),
  sunsetTime: $("#sunset-time"),

  humidity: $("#humidity"),
  windSpeed: $("#wind-speed"),
  pressure: $("#pressure"),
  visibility: $("#visibility"),
  uvValue: $("#uv-value"),
  rainProb: $("#rain-prob"),
  dewPoint: $("#dew-point"),
  cloudCover: $("#cloud-cover"),
  aqiCard: $("#aqi-card"),
  aqiValue: $("#aqi-value"),

  hourlyScroll: $("#hourly-scroll"),
  dailyList: $("#daily-list"),

  historyWrap: $("#history-wrap"),
  historyList: $("#history-list"),

  cityInput: $("#city-input"),
  locateBtn: $("#locate-btn"),
  retryBtn: $("#retry-btn"),
 
};

/* ---------------- View state machine ---------------- */

export function showLoading() {
  els.spinner.hidden = false;
  els.skeleton.hidden = false;
  els.errorState.hidden = true;
  els.dashboard.hidden = true;
  els.searchError.textContent = "";
}

export function showError(type, city) {
  els.spinner.hidden = true;
  els.skeleton.hidden = true;
  els.dashboard.hidden = true;
  els.errorState.hidden = false;

  if (type === "not-found") {
    els.errorTitle.textContent = "City not found";
    els.errorMessage.textContent = city
      ? `We couldn't find "${city}". Check the spelling and try again.`
      : "We couldn't find that location. Check the spelling and try again.";
  } else if (type === "network") {
    els.errorTitle.textContent = "Connection problem";
    els.errorMessage.textContent =
      "We couldn't reach the weather service. Check your internet connection and try again.";
  } else if (type === "geolocation") {
    els.errorTitle.textContent = "Location unavailable";
    els.errorMessage.textContent =
      "We couldn't access your location. Please allow location access or search for a city instead.";
  } else {
    els.errorTitle.textContent = "Something went wrong";
    els.errorMessage.textContent = "Please try again in a moment.";
  }
}

export function showDashboard() {
  els.spinner.hidden = true;
  els.skeleton.hidden = true;
  els.errorState.hidden = true;
  els.dashboard.hidden = false;
}

/* ---------------- Renderers ---------------- */

function formatTime(unixSeconds, timezoneOffsetSeconds = 0) {
  const date = new Date((unixSeconds + timezoneOffsetSeconds) * 1000);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function formatDayLabel(date) {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

/** Magnus formula approximation — good enough for display purposes. */
function calcDewPoint(tempC, humidityPct) {
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * tempC) / (b + tempC) + Math.log(humidityPct / 100);
  return (b * alpha) / (a - alpha);
}

export function renderCurrentWeather(data) {
  const tz = data.timezone || 0;
  const now = new Date(Date.now() + tz * 1000);

  els.cityName.textContent = `${data.name}`;
  els.dateTime.textContent = now.toLocaleString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  els.lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  els.weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  els.weatherIcon.alt = data.weather[0].description;

  els.tempValue.textContent = Math.round(data.main.temp);
  els.weatherDesc.textContent = data.weather[0].description;
  els.feelsLike.textContent = `Feels like ${Math.round(data.main.feels_like)}°`;

  els.country.textContent = data.sys?.country || "—";
  els.sunriseTime.textContent = formatTime(data.sys.sunrise, tz);
  els.sunsetTime.textContent = formatTime(data.sys.sunset, tz);

  els.humidity.textContent = data.main.humidity;
  els.windSpeed.textContent = (data.wind.speed * 3.6).toFixed(1); // m/s -> km/h
  els.pressure.textContent = data.main.pressure;
  els.visibility.textContent = (data.visibility / 1000).toFixed(1);

  if (els.dewPoint) {
    els.dewPoint.textContent = Math.round(
      calcDewPoint(data.main.temp, data.main.humidity)
    );
  }
  if (els.cloudCover) {
    els.cloudCover.textContent = data.clouds?.all ?? "--";
  }
}

export function renderUv(oneCallData) {
  if (!oneCallData) {
    els.uvValue.textContent = "N/A";
    return;
  }
  const uv = oneCallData.current?.uvi;
  els.uvValue.textContent = uv != null ? uv.toFixed(1) : "N/A";

  const rainChance = oneCallData.hourly?.[0]?.pop;
  if (rainChance != null) {
    els.rainProb.textContent = Math.round(rainChance * 100);
  }
}

const AQI_LABELS = {
  1: { label: "Good", className: "aqi-good" },
  2: { label: "Fair", className: "aqi-fair" },
  3: { label: "Moderate", className: "aqi-moderate" },
  4: { label: "Poor", className: "aqi-poor" },
  5: { label: "Very Poor", className: "aqi-very-poor" },
};

export function renderAqi(aqiData) {
  const aqi = aqiData?.list?.[0]?.main?.aqi;
  els.aqiCard.classList.remove("aqi-good", "aqi-fair", "aqi-moderate", "aqi-poor", "aqi-very-poor");

  if (!aqi) {
    els.aqiValue.textContent = "N/A";
    return;
  }
  const info = AQI_LABELS[aqi] || { label: "—", className: "" };
  els.aqiValue.textContent = info.label;
  if (info.className) els.aqiCard.classList.add(info.className);
}

export function renderHourly(forecastData) {
  const tz = forecastData.city?.timezone || 0;
  const items = forecastData.list.slice(0, 8); // next 24h, 3h steps

  els.hourlyScroll.innerHTML = items
    .map((item) => {
      const time = formatTime(item.dt, tz);
      const icon = item.weather[0].icon;
      const temp = Math.round(item.main.temp);
      return `
        <div class="hour-item" role="listitem">
          <span class="hour-time">${escapeHtml(time)}</span>
          <img class="hour-icon" src="https://openweathermap.org/img/wn/${escapeHtml(icon)}.png" alt="${escapeHtml(item.weather[0].description)}" loading="lazy" width="36" height="36" />
          <span class="hour-temp">${temp}°</span>
        </div>`;
    })
    .join("");
}

export function renderDaily(forecastData) {
  const tz = forecastData.city?.timezone || 0;

  // Group 3-hour entries by calendar day (using the location's local date).
  const byDay = new Map();
  forecastData.list.forEach((item) => {
    const localDate = new Date((item.dt + tz) * 1000);
    const key = localDate.toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(item);
  });

  const days = Array.from(byDay.entries()).slice(0, 5);

  els.dailyList.innerHTML = days
    .map(([key, entries]) => {
      const temps = entries.map((e) => e.main.temp);
      const high = Math.round(Math.max(...temps));
      const low = Math.round(Math.min(...temps));
      // Pick the entry closest to midday for a representative icon/description.
      const rep =
        entries.find((e) => new Date((e.dt + tz) * 1000).getUTCHours() === 12) ||
        entries[Math.floor(entries.length / 2)];
      const date = new Date(`${key}T00:00:00Z`);

      return `
        <div class="day-item" role="listitem">
          <span class="day-name">${escapeHtml(formatDayLabel(date))}</span>
          <img class="day-icon" src="https://openweathermap.org/img/wn/${escapeHtml(rep.weather[0].icon)}.png" alt="${escapeHtml(rep.weather[0].description)}" loading="lazy" width="32" height="32" />
          <span class="day-desc">${escapeHtml(rep.weather[0].description)}</span>
          <span class="day-temps">${high}° <span class="temp-low">${low}°</span></span>
        </div>`;
    })
    .join("");
}

/* ---------------- Search History UI ---------------- */

export function renderHistory(history, onSelect) {
  if (!history.length) {
    els.historyWrap.hidden = true;
    return;
  }
  els.historyWrap.hidden = false;
  els.historyList.innerHTML = history
    .map((city) => `<li><button type="button" class="history-chip">${escapeHtml(city)}</button></li>`)
    .join("");

  els.historyList.querySelectorAll(".history-chip").forEach((btn, i) => {
    btn.addEventListener("click", () => onSelect(history[i]));
  });
}



/* ---------------- Ripple effect ---------------- */

export function attachRipple(button) {
  button.addEventListener("click", (e) => {
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement("span");
    const size = Math.max(rect.width, rect.height);
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    button.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  });
}
