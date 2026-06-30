/**
 * storage.js
 * Wraps all LocalStorage interactions: theme preference and search history.
 */

const THEME_KEY = "skyline:theme";
const HISTORY_KEY = "skyline:history";
const MAX_HISTORY = 5;

/* ---------------- Theme ---------------- */

export function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

export function setStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore (e.g. private browsing quota errors) */
  }
}

/* ---------------- Search History ---------------- */

export function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToHistory(cityName) {
  const trimmed = cityName.trim();
  if (!trimmed) return getHistory();

  let history = getHistory().filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase()
  );
  history.unshift(trimmed);
  history = history.slice(0, MAX_HISTORY);

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    /* ignore */
  }

  return history;
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
}
