import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";
import { normalizeMuxingConfig } from "../src/tool-bridge";
import { safeParseMuxingPlatformConfig } from "../src/config";

describe("static browser assets", () => {
  it("build emits a standalone theme bridge IIFE for static tools", () => {
    const assetPath = resolve(__dirname, "../dist/theme-bridge.global.js");

    expect(existsSync(assetPath)).toBe(true);

    const asset = readFileSync(assetPath, "utf8");
    expect(asset).toContain("muxing:set-theme");
    expect(asset).toContain("BRIDGE_VERSION");
    expect(asset).not.toMatch(/(^|\n)\s*export\s/);
  });

  it("build emits a standalone tool bridge IIFE for static tools", () => {
    const assetPath = resolve(__dirname, "../dist/tool-bridge.global.js");

    expect(existsSync(assetPath)).toBe(true);

    const asset = readFileSync(assetPath, "utf8");
    expect(asset).toContain("MuxingToolBridge");
    expect(asset).toContain("muxing:request-api-config");
    expect(asset).toContain("muxing:route-status");
    expect(asset).not.toMatch(/(^|\n)\s*export\s/);
  });

  it("tool bridge global uses the same normalization behavior as the ESM bridge", () => {
    const assetPath = resolve(__dirname, "../dist/tool-bridge.global.js");
    const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
      url: "https://tool.example/?muxing-protocol=1&muxing-tool=saihu",
      runScripts: "outside-only"
    });

    dom.window.eval(readFileSync(assetPath, "utf8"));

    const raw = {
      id: "%E8%8A%82%E7%82%B9",
      name: "ä¸»ç«™",
      url: " https://cpa.example/v1/ ",
      key: " sk-test ",
      primaryModel: "gpt-5.5"
    };

    expect(dom.window.MuxingToolBridge.normalizeConfig(raw)).toEqual(normalizeMuxingConfig(raw));

    dom.window.close();
  });

  it("tool bridge global preserves the static script defaultTool option", () => {
    const assetPath = resolve(__dirname, "../dist/tool-bridge.global.js");
    const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
      url: "https://tool.example/?muxing-protocol=1",
      runScripts: "outside-only"
    });
    const postMessage = vi.fn();
    Object.defineProperty(dom.window, "parent", {
      value: { postMessage },
      configurable: true
    });

    dom.window.eval(readFileSync(assetPath, "utf8"));
    dom.window.MuxingToolBridge.requestMuxingContext({ defaultTool: "saihu" });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "muxing-tool",
        type: "muxing:request-api-config",
        version: 1,
        tool: "saihu"
      }),
      "*"
    );

    dom.window.close();
  });

  it("build emits a standalone config validator IIFE for the shell", () => {
    const assetPath = resolve(__dirname, "../dist/config.global.js");

    expect(existsSync(assetPath)).toBe(true);

    const asset = readFileSync(assetPath, "utf8");
    expect(asset).toContain("MuxingPlatformConfig");
    expect(asset).toContain("safeParseMuxingPlatformConfig");
    expect(asset).not.toMatch(/(^|\n)\s*export\s/);
  });

  it("config global uses the same schema behavior as the ESM config parser", () => {
    const assetPath = resolve(__dirname, "../dist/config.global.js");
    const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
      runScripts: "outside-only"
    });

    dom.window.eval(readFileSync(assetPath, "utf8"));

    const raw = {
      version: 1,
      nodes: [
        {
          id: "node-main",
          name: "CPA",
          baseUrl: "https://cpa.example/v1",
          apiKey: "sk-test",
          models: ["gpt-5.5"]
        }
      ]
    };

    expect(dom.window.MuxingPlatformConfig.safeParseMuxingPlatformConfig(raw)).toEqual(
      safeParseMuxingPlatformConfig(raw)
    );

    dom.window.close();
  });

  it("static consumers are byte-for-byte in sync with generated dist assets", () => {
    expect(() =>
      execFileSync(process.execPath, ["scripts/sync-static-consumers.mjs", "--check"], {
        cwd: resolve(__dirname, ".."),
        stdio: "pipe"
      })
    ).not.toThrow();
  });
});
