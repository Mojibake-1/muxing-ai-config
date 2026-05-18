import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { createMuxingThemeBridgeScript } from "../src/theme-bridge";

function runThemeBridge(url = "https://tool.example/?muxing-theme=stellar") {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url,
    runScripts: "outside-only"
  });

  const script = createMuxingThemeBridgeScript({
    storageKey: "muxing-theme",
    themes: ["light", "dark", "nature", "stellar"]
  });

  dom.window.eval(script);

  return dom;
}

describe("theme bridge script", () => {
  it("applies the query theme and persists it", () => {
    const dom = runThemeBridge("https://tool.example/?muxing-theme=stellar");

    expect(dom.window.document.documentElement.getAttribute("data-theme")).toBe("stellar");
    expect(dom.window.localStorage.getItem("muxing-theme")).toBe("stellar");

    dom.window.close();
  });

  it("falls back to the stored theme and removes the light theme attribute", () => {
    const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
      url: "https://tool.example/",
      runScripts: "outside-only"
    });
    dom.window.localStorage.setItem("muxing-theme", "nature");

    dom.window.eval(createMuxingThemeBridgeScript({ storageKey: "muxing-theme" }));

    expect(dom.window.document.documentElement.getAttribute("data-theme")).toBe("nature");

    dom.window.dispatchEvent(
      new dom.window.MessageEvent("message", {
        data: {
          source: "muxing-workbench",
          type: "muxing:set-theme",
          version: 1,
          theme: "light"
        }
      })
    );

    expect(dom.window.document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(dom.window.localStorage.getItem("muxing-theme")).toBe("light");

    dom.window.close();
  });

  it("applies only workbench theme messages with a supported version", () => {
    const dom = runThemeBridge("https://tool.example/");
    const html = dom.window.document.documentElement;

    dom.window.dispatchEvent(
      new dom.window.MessageEvent("message", {
        data: {
          source: "muxing-workbench",
          type: "muxing:set-theme",
          version: 999,
          theme: "dark"
        }
      })
    );
    expect(html.hasAttribute("data-theme")).toBe(false);

    dom.window.dispatchEvent(
      new dom.window.MessageEvent("message", {
        data: {
          source: "muxing-workbench",
          type: "muxing:set-theme",
          version: 1,
          theme: "dark"
        }
      })
    );
    expect(html.getAttribute("data-theme")).toBe("dark");

    dom.window.dispatchEvent(
      new dom.window.MessageEvent("message", {
        data: {
          source: "other-shell",
          type: "muxing:set-theme",
          version: 1,
          theme: "nature"
        }
      })
    );
    expect(html.getAttribute("data-theme")).toBe("dark");

    dom.window.dispatchEvent(
      new dom.window.MessageEvent("message", {
        data: {
          source: "muxing-workbench",
          type: "muxing:set-theme",
          version: 1,
          theme: "unknown-theme"
        }
      })
    );
    expect(html.hasAttribute("data-theme")).toBe(false);

    dom.window.close();
  });
});
