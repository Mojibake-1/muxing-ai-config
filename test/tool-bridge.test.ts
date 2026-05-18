import { describe, expect, it, vi } from "vitest";
import {
  clearStoredMuxingConfig,
  getMuxingTool,
  isMuxingEmbeddedContext,
  isRouteRequestLimitIssue,
  normalizeDisplayLabel,
  normalizeMuxingConfig,
  readStoredMuxingConfig,
  reportMuxingRouteStatus,
  requestMuxingContext,
  requestMuxingTheme,
  storeMuxingConfig,
  subscribeToMuxingContext
} from "../src/tool-bridge";

function createWindowStub(search = "?muxing-embed=1&muxing-tool=rufus") {
  const listeners = new Map<string, Set<(event: MessageEvent) => void>>();
  const storage = new Map<string, string>();
  const postMessage = vi.fn();
  const win = {
    location: { search },
    parent: { postMessage },
    addEventListener: vi.fn((type: string, listener: (event: MessageEvent) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: (event: MessageEvent) => void) => {
      listeners.get(type)?.delete(listener);
    }),
    localStorage: {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      })
    }
  };

  return {
    win,
    postMessage,
    dispatch(data: unknown) {
      for (const listener of listeners.get("message") ?? []) {
        listener({ data, origin: "https://muxing.example" } as MessageEvent);
      }
    },
    dispatchFrom(origin: string, data: unknown) {
      for (const listener of listeners.get("message") ?? []) {
        listener({ data, origin } as MessageEvent);
      }
    }
  };
}

describe("tool bridge helpers", () => {
  it("normalizes labels and bridge config values", () => {
    expect(normalizeDisplayLabel("%E4%B8%BB%E7%AB%99")).toBe("主站");
    expect(normalizeDisplayLabel("ä¸»ç«™")).toBe("主站");

    expect(
      normalizeMuxingConfig({
        nodeId: "%E8%8A%82%E7%82%B9",
        nodeName: "CPA",
        baseUrl: " https://cpa.example/v1 ",
        apiKey: " sk-test ",
        model: "gpt-5.5"
      })
    ).toEqual({
      nodeId: "节点",
      nodeName: "CPA",
      baseUrl: "https://cpa.example/v1",
      apiKey: "sk-test",
      model: "gpt-5.5"
    });

    expect(normalizeMuxingConfig({ baseUrl: "https://cpa.example/v1", model: "gpt-5.5" })).toBeNull();
  });

  it("normalizes legacy API config aliases used by existing tools", () => {
    expect(
      normalizeMuxingConfig({
        id: "node-main",
        name: "CPA",
        url: " https://cpa.example/v1/ ",
        key: " sk-test ",
        primaryModel: "gpt-5.5"
      })
    ).toEqual({
      nodeId: "node-main",
      nodeName: "CPA",
      baseUrl: "https://cpa.example/v1",
      apiKey: "sk-test",
      model: "gpt-5.5"
    });
  });

  it("detects route request limit issues from text", () => {
    expect(isRouteRequestLimitIssue("The max_tokens limit was reached")).toBe(true);
    expect(isRouteRequestLimitIssue("context length exceeded")).toBe(true);
    expect(isRouteRequestLimitIssue("upstream unavailable")).toBe(false);
  });

  it("detects embedded context and active tool from query params", () => {
    const { win } = createWindowStub("?muxing-embed=1&muxing-tool=rufus");

    expect(isMuxingEmbeddedContext(win)).toBe(true);
    expect(getMuxingTool("fallback", win)).toBe("rufus");

    const protocolWindow = createWindowStub("?muxing-protocol=1&muxing-tool=photo").win;
    expect(isMuxingEmbeddedContext(protocolWindow)).toBe(true);
    expect(getMuxingTool("fallback", protocolWindow)).toBe("photo");
  });

  it("requests context, theme, and reports route status with a versioned message", () => {
    const { win, postMessage } = createWindowStub();

    expect(requestMuxingContext({ tool: "rufus", win })).toBe(true);
    expect(requestMuxingTheme({ tool: "rufus", win })).toBe(true);
    expect(reportMuxingRouteStatus({ configured: true, apiStatus: "healthy" }, { tool: "rufus", win })).toBe(true);

    expect(postMessage).toHaveBeenNthCalledWith(
      1,
      {
        source: "muxing-tool",
        type: "muxing:request-api-config",
        version: 1,
        tool: "rufus"
      },
      "*"
    );
    expect(postMessage).toHaveBeenNthCalledWith(
      2,
      {
        source: "muxing-tool",
        type: "muxing:request-theme",
        version: 1,
        tool: "rufus"
      },
      "*"
    );
    expect(postMessage).toHaveBeenNthCalledWith(
      3,
      {
        source: "muxing-tool",
        type: "muxing:route-status",
        version: 1,
        tool: "rufus",
        payload: { configured: true, apiStatus: "healthy" }
      },
      "*"
    );
  });

  it("subscribes only to matching workbench messages", () => {
    const { win, dispatch } = createWindowStub();
    const onConfig = vi.fn();
    const onMissingConfig = vi.fn();

    const unsubscribe = subscribeToMuxingContext({
      tool: "rufus",
      win,
      onConfig,
      onMissingConfig
    });

    dispatch({
      source: "muxing-workbench",
      type: "muxing:set-api-config",
      version: 999,
      tool: "rufus",
      configured: true,
      config: { baseUrl: "https://old.example/v1", apiKey: "sk-old", model: "gpt-5.5" }
    });
    dispatch({
      source: "muxing-workbench",
      type: "muxing:set-api-config",
      version: 1,
      tool: "photo",
      configured: true,
      config: { baseUrl: "https://photo.example/v1", apiKey: "sk-photo", model: "gpt-5.5" }
    });
    dispatch({
      source: "muxing-workbench",
      type: "muxing:set-api-config",
      version: 1,
      tool: "rufus",
      configured: true,
      config: { baseUrl: "https://rufus.example/v1", apiKey: "sk-rufus", model: "gpt-5.5" }
    });
    dispatch({
      source: "muxing-workbench",
      type: "muxing:set-api-config",
      version: 1,
      tool: "rufus",
      configured: false
    });

    expect(onConfig).toHaveBeenCalledTimes(1);
    expect(onConfig.mock.calls[0][0]).toMatchObject({ baseUrl: "https://rufus.example/v1" });
    expect(onMissingConfig).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(win.removeEventListener).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("can filter workbench messages by trusted origins", () => {
    const { win, dispatchFrom } = createWindowStub();
    const onConfig = vi.fn();

    subscribeToMuxingContext({
      tool: "rufus",
      win,
      trustedOrigins: ["https://muxing.example"],
      onConfig
    });

    dispatchFrom("https://evil.example", {
      source: "muxing-workbench",
      type: "muxing:set-api-config",
      version: 1,
      tool: "rufus",
      configured: true,
      config: { baseUrl: "https://evil.example/v1", apiKey: "sk-evil", model: "gpt-5.5" }
    });
    dispatchFrom("https://muxing.example", {
      source: "muxing-workbench",
      type: "muxing:set-api-config",
      version: 1,
      tool: "rufus",
      configured: true,
      config: { baseUrl: "https://muxing.example/v1", apiKey: "sk-ok", model: "gpt-5.5" }
    });

    expect(onConfig).toHaveBeenCalledTimes(1);
    expect(onConfig.mock.calls[0][0]).toMatchObject({ baseUrl: "https://muxing.example/v1" });
  });

  it("reads, stores, and clears normalized config from localStorage", () => {
    const { win } = createWindowStub();
    const config = {
      nodeId: "node-main",
      nodeName: "CPA",
      baseUrl: "https://cpa.example/v1",
      apiKey: "sk-test",
      model: "gpt-5.5"
    };

    storeMuxingConfig("muxing:test", config, win);

    expect(readStoredMuxingConfig("muxing:test", win)).toEqual(config);

    clearStoredMuxingConfig("muxing:test", win);

    expect(readStoredMuxingConfig("muxing:test", win)).toBeNull();
  });
});
