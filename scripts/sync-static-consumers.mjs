import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mode = process.argv.includes("--write") ? "write" : "check";
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(packageRoot, "..");

const consumers = [
  {
    source: "dist/config.global.js",
    target: "../沐星工具站/muxing-platform-config.global.js"
  },
  {
    source: "dist/theme-bridge.global.js",
    target: "../excel-formula-checker/theme.js"
  },
  {
    source: "dist/theme-bridge.global.js",
    target: "../mxzone-listing-preview/muxing-theme-bridge.global.js"
  },
  {
    source: "dist/theme-bridge.global.js",
    target: "../mxzone-listing-preview/skill/assets/muxing-theme-bridge.global.js"
  },
  {
    source: "dist/tool-bridge.global.js",
    target: "../saihu-chart-lab/muxing-tool-bridge.global.js"
  },
  {
    source: "dist/theme-bridge.global.js",
    target: "../Photography-Coach-AI-Handover/public/muxing-theme-bridge.global.js"
  }
];

const mismatches = [];

for (const consumer of consumers) {
  const sourcePath = resolve(packageRoot, consumer.source);
  const targetPath = resolve(packageRoot, consumer.target);

  if (!targetPath.startsWith(workspaceRoot)) {
    throw new Error(`Refusing to sync outside workspace: ${targetPath}`);
  }

  const sourceContent = readFileSync(sourcePath, "utf8");
  const targetContent = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : null;

  if (targetContent === sourceContent) continue;

  if (mode === "write") {
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, sourceContent, "utf8");
    console.log(`synced ${relative(workspaceRoot, targetPath)}`);
  } else {
    mismatches.push(`${relative(workspaceRoot, targetPath)} should match ${relative(packageRoot, sourcePath)}`);
  }
}

if (mismatches.length) {
  console.error(`Static consumer asset mismatch:\n${mismatches.map((item) => `- ${item}`).join("\n")}`);
  process.exit(1);
}

if (mode === "check") {
  console.log("static consumer assets are in sync");
}
