import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import type { AssessmentResult } from "./types";

export interface VisionCacheAsset {
  hash: string;
  kind?: string;
}

export interface VisionCacheKeyInput {
  provider: string;
  model?: string;
  baseUrl?: string;
  profile?: string;
  prompt?: string;
  promptSchemaVersion?: string;
  assets?: VisionCacheAsset[];
  options?: Record<string, unknown>;
}

export interface VisionCacheRecord {
  storedAt: string;
  key: string;
  result: AssessmentResult;
}

function normalizeString(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value.replace(/\r\n?/g, "\n").replace(/[\t ]+$/gm, "").trim() || undefined;
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        const normalized = normalizeValue((value as Record<string, unknown>)[key]);
        if (normalized !== undefined) acc[key] = normalized;
        return acc;
      }, {});
  }

  if (typeof value === "string") {
    return normalizeString(value);
  }

  return value;
}

export function normalizePromptForCache(prompt: string | undefined): string | undefined {
  return normalizeString(prompt);
}

export function sha256(input: string | Buffer): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function hashFileContents(filePath: string): string {
  return sha256(fs.readFileSync(filePath));
}

export function buildVisionCachePayload(input: VisionCacheKeyInput): Record<string, unknown> {
  return normalizeValue({
    version: input.promptSchemaVersion ?? "v2",
    provider: input.provider,
    model: input.model,
    baseUrl: input.baseUrl,
    profile: input.profile,
    prompt: normalizePromptForCache(input.prompt),
    assets: input.assets?.map((asset) => ({ hash: asset.hash, kind: asset.kind })),
    options: input.options,
  }) as Record<string, unknown>;
}

export function buildVisionCacheKey(input: VisionCacheKeyInput): string {
  return sha256(JSON.stringify(buildVisionCachePayload(input)));
}

export function buildVisionCacheKeyFromFiles(
  input: Omit<VisionCacheKeyInput, "assets"> & { assetPaths: string[] },
): string {
  return buildVisionCacheKey({
    ...input,
    assets: input.assetPaths.map((filePath) => ({ hash: hashFileContents(filePath) })),
  });
}

export function getVisionTmpRoot(): string {
  return process.env.VISION_CHECKER_TMP_DIR ?? path.join(os.tmpdir(), "affyink-ui-vision-check");
}

export function ensureDir(dirPath: string): string {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

export function getVisionCacheDir(): string {
  return ensureDir(path.join(getVisionTmpRoot(), "cache"));
}

export function getVisionReportsDir(): string {
  return ensureDir(path.join(getVisionTmpRoot(), "reports"));
}

export function getVisionCachePath(cacheKey: string): string {
  return path.join(getVisionCacheDir(), `${cacheKey}.json`);
}

export function createReportPath(): string {
  const stamp = new Date().toISOString().replace(/[:]/g, "-").replace(/\..+/, "Z");
  const random = crypto.randomBytes(4).toString("hex");
  return path.join(getVisionReportsDir(), `${stamp}-${process.pid}-${random}.json`);
}

export function readVisionCache(cachePath: string): VisionCacheRecord | undefined {
  if (!fs.existsSync(cachePath)) return undefined;

  try {
    return JSON.parse(fs.readFileSync(cachePath, "utf8")) as VisionCacheRecord;
  } catch {
    return undefined;
  }
}

export function writeVisionCache(cachePath: string, key: string, result: AssessmentResult): void {
  ensureDir(path.dirname(cachePath));
  const record: VisionCacheRecord = {
    storedAt: new Date().toISOString(),
    key,
    result,
  };
  fs.writeFileSync(cachePath, JSON.stringify(record, null, 2) + "\n");
}
