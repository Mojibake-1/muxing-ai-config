import type { MuxingApiConfig } from "./config";

export type { MuxingApiConfig } from "./config";

export const MUXING_BRIDGE_VERSION = 1;
export const MUXING_TOOL_SOURCE = "muxing-tool";
export const MUXING_WORKBENCH_SOURCE = "muxing-workbench";
export const MUXING_REQUEST_API_CONFIG = "muxing:request-api-config";
export const MUXING_REQUEST_THEME = "muxing:request-theme";
export const MUXING_SET_API_CONFIG = "muxing:set-api-config";
export const MUXING_SET_THEME = "muxing:set-theme";
export const MUXING_ROUTE_STATUS = "muxing:route-status";

export interface MuxingRouteStatusPayload {
  configured: boolean;
  nodeName?: string;
  model?: string;
  source?: "bridge" | "fallback" | "";
  apiStatus?: string;
  [key: string]: unknown;
}

interface MuxingStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface MuxingParentLike {
  postMessage(message: unknown, targetOrigin: string): void;
}

export interface MuxingWindowLike {
  location?: { search?: string };
  parent?: MuxingParentLike | MuxingWindowLike | null;
  localStorage?: MuxingStorageLike;
  addEventListener?(type: "message", listener: (event: MessageEvent) => void): void;
  removeEventListener?(type: "message", listener: (event: MessageEvent) => void): void;
}

export interface MuxingBridgeOptions {
  tool?: string;
  targetOrigin?: string;
  win?: MuxingWindowLike;
}

export interface SubscribeMuxingContextOptions extends MuxingBridgeOptions {
  onConfig?: (config: MuxingApiConfig, event: MessageEvent) => void;
  onMissingConfig?: (event: MessageEvent) => void;
  onTheme?: (theme: string, event: MessageEvent) => void;
  trustedOrigins?: string[] | ((origin: string, event: MessageEvent) => boolean);
}

function getDefaultWindow(): MuxingWindowLike | undefined {
  return typeof window === "undefined" ? undefined : window;
}

function getBridgeWindow(win?: MuxingWindowLike): MuxingWindowLike | undefined {
  return win ?? getDefaultWindow();
}

function getParentWindow(win: MuxingWindowLike): MuxingParentLike | null {
  const parent = win.parent;
  const candidate = parent as MuxingParentLike | null | undefined;
  if (!candidate || candidate === win || typeof candidate.postMessage !== "function") {
    return null;
  }
  return candidate;
}

function isSupportedBridgeVersion(version: unknown): boolean {
  return version == null || version === MUXING_BRIDGE_VERSION;
}

export function decodePercentEncoded(value: string): string {
  let output = value;
  for (let i = 0; i < 2; i += 1) {
    if (!/%[0-9A-Fa-f]{2}/.test(output)) break;
    try {
      const decoded = decodeURIComponent(output);
      if (decoded === output) break;
      output = decoded;
    } catch {
      break;
    }
  }
  return output;
}

export function decodeLatin1Mojibake(value: string): string {
  try {
    const windows1252 = new Map<number, number>([
      [0x20ac, 0x80],
      [0x201a, 0x82],
      [0x0192, 0x83],
      [0x201e, 0x84],
      [0x2026, 0x85],
      [0x2020, 0x86],
      [0x2021, 0x87],
      [0x02c6, 0x88],
      [0x2030, 0x89],
      [0x0160, 0x8a],
      [0x2039, 0x8b],
      [0x0152, 0x8c],
      [0x017d, 0x8e],
      [0x2018, 0x91],
      [0x2019, 0x92],
      [0x201c, 0x93],
      [0x201d, 0x94],
      [0x2022, 0x95],
      [0x2013, 0x96],
      [0x2014, 0x97],
      [0x02dc, 0x98],
      [0x2122, 0x99],
      [0x0161, 0x9a],
      [0x203a, 0x9b],
      [0x0153, 0x9c],
      [0x017e, 0x9e],
      [0x0178, 0x9f]
    ]);
    const bytes = Uint8Array.from(Array.from(value), (char) => {
      const codePoint = char.codePointAt(0) ?? 0;
      return windows1252.get(codePoint) ?? (codePoint & 0xff);
    });
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
}

export function normalizeDisplayLabel(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  let output = decodePercentEncoded(raw);
  if (/[ÃÂäåæçèéêëîïôöûü]/.test(output)) {
    output = decodeLatin1Mojibake(output);
  }

  return output.trim();
}

export function normalizeMuxingConfig(raw: unknown): MuxingApiConfig | null {
  if (!raw || typeof raw !== "object") return null;

  const source = raw as Record<string, unknown>;
  const baseUrl = String(source.baseUrl || source.url || "").trim().replace(/\/+$/, "");
  const apiKey = String(source.apiKey || source.key || "").trim();
  const model = normalizeDisplayLabel(source.model || source.primaryModel);

  if (!baseUrl || !apiKey || !model) return null;

  return {
    nodeId: normalizeDisplayLabel(source.nodeId || source.id),
    nodeName: normalizeDisplayLabel(source.nodeName || source.name),
    baseUrl,
    apiKey,
    model
  };
}

export function isRouteRequestLimitIssue(value: unknown): boolean {
  const normalized = String(value ?? "").toLowerCase();
  return (
    normalized.includes("max_tokens") ||
    normalized.includes("model output limit") ||
    normalized.includes("output limit was reached") ||
    normalized.includes("higher max_tokens") ||
    normalized.includes("context length")
  );
}

export function getMuxingTool(fallbackTool = "", win?: MuxingWindowLike): string {
  const activeWindow = getBridgeWindow(win);
  const query = new URLSearchParams(activeWindow?.location?.search || "");
  return query.get("muxing-tool") || fallbackTool;
}

export function isMuxingEmbeddedContext(win?: MuxingWindowLike): boolean {
  const activeWindow = getBridgeWindow(win);
  if (!activeWindow) return false;

  const query = new URLSearchParams(activeWindow.location?.search || "");
  return (
    (query.get("muxing-embed") === "1" || query.get("muxing-protocol") === "1") &&
    Boolean(getParentWindow(activeWindow))
  );
}

function postMuxingToolMessage(
  type: string,
  options: MuxingBridgeOptions = {},
  extra: Record<string, unknown> = {}
): boolean {
  const activeWindow = getBridgeWindow(options.win);
  if (!activeWindow) return false;

  const parent = getParentWindow(activeWindow);
  if (!parent) return false;

  parent.postMessage(
    {
      source: MUXING_TOOL_SOURCE,
      type,
      version: MUXING_BRIDGE_VERSION,
      tool: options.tool || getMuxingTool("", activeWindow),
      ...extra
    },
    options.targetOrigin || "*"
  );

  return true;
}

export function requestMuxingContext(options: MuxingBridgeOptions = {}): boolean {
  return postMuxingToolMessage(MUXING_REQUEST_API_CONFIG, options);
}

export function requestMuxingTheme(options: MuxingBridgeOptions = {}): boolean {
  return postMuxingToolMessage(MUXING_REQUEST_THEME, options);
}

export function reportMuxingRouteStatus(
  payload: MuxingRouteStatusPayload,
  options: MuxingBridgeOptions = {}
): boolean {
  const activeWindow = getBridgeWindow(options.win);
  if (!activeWindow) return false;

  const parent = getParentWindow(activeWindow);
  if (!parent) return false;
  return postMuxingToolMessage(MUXING_ROUTE_STATUS, options, { payload });
}

export function subscribeToMuxingContext(options: SubscribeMuxingContextOptions): () => void {
  const activeWindow = getBridgeWindow(options.win);
  if (!activeWindow?.addEventListener || !activeWindow.removeEventListener) {
    return () => {};
  }

  const tool = options.tool || getMuxingTool("", activeWindow);
  const isTrustedOrigin = (event: MessageEvent) => {
    if (!options.trustedOrigins) return true;
    if (typeof options.trustedOrigins === "function") {
      return options.trustedOrigins(event.origin, event);
    }
    return options.trustedOrigins.includes(event.origin);
  };
  const handleMessage = (event: MessageEvent) => {
    if (!isTrustedOrigin(event)) return;

    const data = event.data;
    if (!data || typeof data !== "object") return;

    const message = data as Record<string, unknown>;
    if (message.source !== MUXING_WORKBENCH_SOURCE) return;
    if (!isSupportedBridgeVersion(message.version)) return;
    if (message.tool && message.tool !== tool) return;

    if (message.type === MUXING_SET_THEME && options.onTheme) {
      options.onTheme(String(message.theme || ""), event);
      return;
    }

    if (message.type !== MUXING_SET_API_CONFIG) return;

    const normalized = normalizeMuxingConfig(message.config);
    if (message.configured && normalized) {
      options.onConfig?.(normalized, event);
    } else {
      options.onMissingConfig?.(event);
    }
  };

  activeWindow.addEventListener("message", handleMessage);

  return () => {
    activeWindow.removeEventListener?.("message", handleMessage);
  };
}

export function readStoredMuxingConfig(storageKey: string, win?: MuxingWindowLike): MuxingApiConfig | null {
  try {
    const raw = getBridgeWindow(win)?.localStorage?.getItem(storageKey);
    if (!raw) return null;
    return normalizeMuxingConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function storeMuxingConfig(storageKey: string, config: MuxingApiConfig, win?: MuxingWindowLike): boolean {
  try {
    const normalized = normalizeMuxingConfig(config);
    if (!normalized) return false;
    getBridgeWindow(win)?.localStorage?.setItem(storageKey, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredMuxingConfig(storageKey: string, win?: MuxingWindowLike): void {
  try {
    getBridgeWindow(win)?.localStorage?.removeItem(storageKey);
  } catch {
    // localStorage may be unavailable in restrictive browser contexts.
  }
}
