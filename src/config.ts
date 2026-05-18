import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

export const muxingAiNodeSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    baseUrl: nonEmptyString,
    apiKey: nonEmptyString,
    models: z.array(nonEmptyString).min(1),
    primaryModel: z.string().trim().optional(),
    reasoningEffort: z.string().trim().optional(),
    tags: z.string().optional(),
    status: z.string().optional(),
    lastTest: z.string().optional(),
    lastLatency: z.number().optional()
  })
  .passthrough();

export const muxingToolBindingSchema = z
  .object({
    nodeId: nonEmptyString,
    model: z.string().trim().optional()
  })
  .passthrough();

export const muxingPlatformConfigSchema = z
  .object({
    version: z.literal(1),
    nodes: z.array(muxingAiNodeSchema).min(1),
    toolBindings: z.record(z.string(), muxingToolBindingSchema).default({})
  })
  .passthrough();

export type MuxingAiNode = z.infer<typeof muxingAiNodeSchema>;
export type MuxingToolBinding = z.infer<typeof muxingToolBindingSchema>;
export type MuxingPlatformConfig = z.infer<typeof muxingPlatformConfigSchema>;

export interface MuxingApiConfig {
  nodeId: string;
  nodeName: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function parseMuxingPlatformConfig(raw: unknown): MuxingPlatformConfig {
  return muxingPlatformConfigSchema.parse(raw);
}

export function safeParseMuxingPlatformConfig(raw: unknown) {
  return muxingPlatformConfigSchema.safeParse(raw);
}

export function resolveToolApiConfig(rawConfig: MuxingPlatformConfig | unknown, tool: string): MuxingApiConfig | null {
  const parsed = muxingPlatformConfigSchema.safeParse(rawConfig);
  if (!parsed.success) return null;

  const binding = parsed.data.toolBindings[tool];
  if (!binding) return null;

  const node = parsed.data.nodes.find((candidate) => candidate.id === binding.nodeId);
  if (!node) return null;

  const model = (binding.model || node.primaryModel || node.models[0] || "").trim();
  if (!model) return null;

  return {
    nodeId: node.id,
    nodeName: node.name,
    baseUrl: node.baseUrl,
    apiKey: node.apiKey,
    model
  };
}
