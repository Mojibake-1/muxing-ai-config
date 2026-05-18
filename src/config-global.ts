import {
  parseMuxingPlatformConfig,
  resolveToolApiConfig,
  safeParseMuxingPlatformConfig
} from "./config";

export const MuxingPlatformConfigGlobal = {
  safeParseMuxingPlatformConfig,
  parseMuxingPlatformConfig,
  resolveToolApiConfig
};

export type MuxingPlatformConfigGlobalApi = typeof MuxingPlatformConfigGlobal;

export function installMuxingPlatformConfigGlobal(
  target: Pick<Window, "MuxingPlatformConfig"> = window
): void {
  target.MuxingPlatformConfig = MuxingPlatformConfigGlobal;
}

declare global {
  interface Window {
    MuxingPlatformConfig?: MuxingPlatformConfigGlobalApi;
  }
}

if (typeof window !== "undefined") {
  installMuxingPlatformConfigGlobal(window);
}
