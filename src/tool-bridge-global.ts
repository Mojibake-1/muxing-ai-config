import {
  MUXING_BRIDGE_VERSION,
  MUXING_REQUEST_API_CONFIG,
  MUXING_REQUEST_THEME,
  MUXING_ROUTE_STATUS,
  MUXING_SET_API_CONFIG,
  MUXING_SET_THEME,
  MUXING_TOOL_SOURCE,
  MUXING_WORKBENCH_SOURCE,
  getMuxingTool,
  isMuxingEmbeddedContext,
  normalizeMuxingConfig,
  reportMuxingRouteStatus,
  requestMuxingContext,
  requestMuxingTheme,
  subscribeToMuxingContext
} from "./tool-bridge";

type GlobalBridgeOptions = Parameters<typeof requestMuxingContext>[0] & {
  defaultTool?: string;
};

type GlobalSubscribeOptions = Parameters<typeof subscribeToMuxingContext>[0] & {
  defaultTool?: string;
};

function withDefaultTool<T extends GlobalBridgeOptions>(options: T = {} as T): T {
  if (options.tool || !options.defaultTool) return options;
  return { ...options, tool: options.defaultTool };
}

export const MuxingToolBridgeGlobal = {
  VERSION: MUXING_BRIDGE_VERSION,
  TOOL_SOURCE: MUXING_TOOL_SOURCE,
  WORKBENCH_SOURCE: MUXING_WORKBENCH_SOURCE,
  REQUEST_API_CONFIG: MUXING_REQUEST_API_CONFIG,
  REQUEST_THEME: MUXING_REQUEST_THEME,
  SET_API_CONFIG: MUXING_SET_API_CONFIG,
  SET_THEME: MUXING_SET_THEME,
  ROUTE_STATUS: MUXING_ROUTE_STATUS,
  getTool: getMuxingTool,
  isEmbedded: isMuxingEmbeddedContext,
  normalizeConfig: normalizeMuxingConfig,
  requestMuxingContext: (options: GlobalBridgeOptions = {}) => requestMuxingContext(withDefaultTool(options)),
  requestMuxingTheme: (options: GlobalBridgeOptions = {}) => requestMuxingTheme(withDefaultTool(options)),
  reportMuxingRouteStatus: (
    payload: Parameters<typeof reportMuxingRouteStatus>[0],
    options: GlobalBridgeOptions = {}
  ) => reportMuxingRouteStatus(payload, withDefaultTool(options)),
  subscribeToMuxingContext: (options: GlobalSubscribeOptions) =>
    subscribeToMuxingContext(withDefaultTool(options))
};

export type MuxingToolBridgeGlobalApi = typeof MuxingToolBridgeGlobal;

export function installMuxingToolBridgeGlobal(target: Pick<Window, "MuxingToolBridge"> = window): void {
  target.MuxingToolBridge = MuxingToolBridgeGlobal;
}

declare global {
  interface Window {
    MuxingToolBridge?: MuxingToolBridgeGlobalApi;
  }
}

if (typeof window !== "undefined") {
  installMuxingToolBridgeGlobal(window);
}
