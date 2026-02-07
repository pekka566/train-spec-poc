const VERSION_KEY = "app:version";

/**
 * Check if the app version has changed since last visit.
 * If so, clear all localStorage data and store the new version.
 * This ensures stale cached data doesn't persist across releases.
 */
export function checkVersionAndClearStorage(): void {
  const stored = localStorage.getItem(VERSION_KEY);
  if (stored !== __APP_VERSION__) {
    localStorage.clear();
    localStorage.setItem(VERSION_KEY, __APP_VERSION__);
  }
}

/** Return the current app version (from package.json at build time). */
export function getAppVersion(): string {
  return __APP_VERSION__;
}
