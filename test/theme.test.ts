import { describe, expect, it } from "vitest";
import {
  THEME_STORAGE_KEY,
  getInitialTheme,
  isDarkTheme,
  isThemeName,
  normalizeTheme,
  readThemeFromSearch,
  themeNames
} from "../src/theme";

describe("shared theme contract", () => {
  it("exposes the platform theme names and storage key", () => {
    expect(themeNames).toEqual(["light", "dark", "nature", "stellar"]);
    expect(THEME_STORAGE_KEY).toBe("muxing-theme");
  });

  it("normalizes and validates themes", () => {
    expect(isThemeName("stellar")).toBe(true);
    expect(isThemeName("bad")).toBe(false);
    expect(normalizeTheme(" stellar ")).toBe("stellar");
    expect(normalizeTheme("bad")).toBe("light");
    expect(isDarkTheme("dark")).toBe(true);
    expect(isDarkTheme("stellar")).toBe(true);
    expect(isDarkTheme("nature")).toBe(false);
  });

  it("reads query theme using muxing-theme before theme", () => {
    expect(readThemeFromSearch("?theme=dark&muxing-theme=nature")).toBe("nature");
    expect(readThemeFromSearch("?theme=bad")).toBeNull();
  });

  it("resolves initial theme from query, storage, then default", () => {
    expect(getInitialTheme("?muxing-theme=stellar", "nature", "dark")).toBe("stellar");
    expect(getInitialTheme("", "nature", "dark")).toBe("nature");
    expect(getInitialTheme("", "bad", "dark")).toBe("dark");
  });
});
