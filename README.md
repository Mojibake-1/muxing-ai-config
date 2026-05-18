# Muxing Platform Contract

This repository is the versioned platform contract package for Muxing workstation tools.
It keeps the existing `muxing-ai-config.json` data source and adds shared runtime helpers for tools.

## Package

The Git-installable package name is `@muxing/platform`.

Exports:

- `@muxing/platform/config`: config schema, parser, and tool binding resolver.
- `@muxing/platform/tool-bridge`: postMessage protocol helpers for embedded tools.
- `@muxing/platform/theme-bridge`: static theme bridge script generation.
- `@muxing/platform/muxing-ai-config.json`: the checked-in config data.

## Git Dependency

Use a Git URL in tool repositories:

```json
{
  "dependencies": {
    "@muxing/platform": "git+ssh://git@github.com/Mojibake-1/muxing-ai-config.git"
  }
}
```

For local migration work before the remote URL is finalized, a tool can temporarily use:

```json
{
  "dependencies": {
    "@muxing/platform": "file:../muxing-ai-config"
  }
}
```

When using the temporary local `file:` dependency with Next/Turbopack, install with:

```bash
npm install --install-links
```

This copies the package into `node_modules` and mirrors the final Git dependency shape more closely than a symlink.

## Commands

```bash
npm install
npm test
npm run typecheck
npm run build
npm run sync:static-consumers
npm run check:static-consumers
```

## Shell Integration

- The classic Muxing shell consumes the generated `dist/config.global.js` browser asset as `muxing-platform-config.global.js`, so `muxing-ai-config.json` is validated at load time before the shell accepts it.
- `dist/tool-bridge.global.js` and `dist/config.global.js` are bundled from the same TypeScript sources as the ESM exports with esbuild. Do not hand-edit global browser copies.
- Static no-build consumers are synchronized by `scripts/sync-static-consumers.mjs`; `npm run check:static-consumers` fails when a vendored copy drifts.
