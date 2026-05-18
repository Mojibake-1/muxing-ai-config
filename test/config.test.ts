import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  muxingPlatformConfigSchema,
  resolveToolApiConfig
} from "../src/config";

describe("muxing platform config schema", () => {
  it("accepts the checked-in muxing-ai-config.json", () => {
    const configPath = resolve(__dirname, "../muxing-ai-config.json");
    const config = JSON.parse(readFileSync(configPath, "utf8"));

    const parsed = muxingPlatformConfigSchema.parse(config);

    expect(parsed.version).toBe(1);
    expect(parsed.nodes.length).toBeGreaterThan(0);
    expect(parsed.toolBindings.rufus.nodeId).toBeTruthy();
  });

  it("rejects a node without API connection fields", () => {
    expect(() =>
      muxingPlatformConfigSchema.parse({
        version: 1,
        nodes: [{ id: "node-1", name: "Broken", models: ["gpt-5.5"] }],
        toolBindings: { rufus: { nodeId: "node-1" } }
      })
    ).toThrow();
  });

  it("resolves a tool binding into the API config shape consumed by tools", () => {
    const resolved = resolveToolApiConfig(
      {
        version: 1,
        nodes: [
          {
            id: "node-main",
            name: "CPA",
            baseUrl: "https://cpa.example/v1",
            apiKey: "sk-test",
            models: ["gpt-5.4", "gpt-5.5"],
            primaryModel: "gpt-5.5"
          }
        ],
        toolBindings: {
          rufus: { nodeId: "node-main" }
        }
      },
      "rufus"
    );

    expect(resolved).toEqual({
      nodeId: "node-main",
      nodeName: "CPA",
      baseUrl: "https://cpa.example/v1",
      apiKey: "sk-test",
      model: "gpt-5.5"
    });
  });

  it("returns null when the binding points at a missing node", () => {
    const resolved = resolveToolApiConfig(
      {
        version: 1,
        nodes: [
          {
            id: "node-main",
            name: "CPA",
            baseUrl: "https://cpa.example/v1",
            apiKey: "sk-test",
            models: ["gpt-5.5"]
          }
        ],
        toolBindings: {
          rufus: { nodeId: "node-missing" }
        }
      },
      "rufus"
    );

    expect(resolved).toBeNull();
  });
});
