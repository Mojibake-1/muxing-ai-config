export const themeNames = ["light", "dark", "nature", "stellar"] as const;
export type ThemeName = (typeof themeNames)[number];
export type ThemePreference = ThemeName | "system";

export const THEME_STORAGE_KEY = "muxing-theme";

const themeNameSet = new Set<string>(themeNames);

export function isThemeName(value: unknown): value is ThemeName {
  return themeNameSet.has(String(value || "").trim().toLowerCase());
}

export function normalizeTheme(value: unknown, fallback: ThemeName = "light"): ThemeName {
  const normalized = String(value || "").trim().toLowerCase();
  return isThemeName(normalized) ? normalized : fallback;
}

export function isDarkTheme(theme: ThemeName): boolean {
  return theme === "dark" || theme === "stellar";
}

export function readThemeFromSearch(search: string): ThemeName | null {
  const params = new URLSearchParams(search);
  const queryTheme = params.get("muxing-theme") || params.get("theme");
  return isThemeName(queryTheme) ? normalizeTheme(queryTheme) : null;
}

export function getInitialTheme(
  search: string,
  storedTheme: string | null | undefined,
  fallback: ThemeName = "light"
): ThemeName {
  const queryTheme = readThemeFromSearch(search);
  if (queryTheme) return queryTheme;

  if (isThemeName(storedTheme)) return normalizeTheme(storedTheme);

  return fallback;
}
