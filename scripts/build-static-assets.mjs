import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { createMuxingThemeBridgeScript } from "../dist/theme-bridge.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(root, "dist");

mkdirSync(distDir, { recursive: true });

writeFileSync(
  resolve(distDir, "theme-bridge.global.js"),
  `${createMuxingThemeBridgeScript()}\n`,
  "utf8"
);

const sharedOptions = {
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  sourcemap: false,
  minify: false,
  legalComments: "none",
  logLevel: "silent"
};

await Promise.all([
  build({
    ...sharedOptions,
    entryPoints: [resolve(root, "src/tool-bridge-global.ts")],
    outfile: resolve(distDir, "tool-bridge.global.js")
  }),
  build({
    ...sharedOptions,
    entryPoints: [resolve(root, "src/config-global.ts")],
    outfile: resolve(distDir, "config.global.js")
  })
]);
