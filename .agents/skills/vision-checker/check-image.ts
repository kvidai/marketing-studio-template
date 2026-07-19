import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config as dotenvConfig } from "dotenv";
import {
  buildVisionCacheKey,
  createReportPath,
  getVisionCachePath,
  hashFileContents,
  normalizePromptForCache,
  readVisionCache,
  sha256,
  writeVisionCache,
} from "./lib/cache";
import { prepareReviewAssets } from "./lib/image-prep";
import { reviewWithProvider } from "./lib/providers";
import { runPrecheck } from "./lib/precheck";
import { resolveImageTargets } from "./lib/targets";
import type { AssessmentResult, BatchAssessmentResult, RuntimeOptions, ProviderKind, VisionCheckResult, CacheMetadata } from "./lib/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.join(__dirname, ".env"), override: false });

function printUsageAndExit(): never {
  console.error(`Usage: pnpm check <image-file-or-dir> [--provider <name>] [--model <name>] [--base-url <url>] [--output <file>] [--tiles <n>] [--overview-width <n>] [--overview-quality <1-100>] [--profile <name>] [--prompt-text <text>] [--prompt-file <file>] [--keep-artifacts] [--cache-read] [--cache-write] [--no-cache] [--force-provider] [--concurrency <n>]\n\n- Supports a single image file or a directory of ordered image files.\n- Directory inputs are useful for PPT exports, slide decks, or video-edit frame batches.\n- If you run through pnpm --dir, prefer absolute target paths.\n- --prompt-text and --prompt-file can be repeated and mixed in any order; they are concatenated in sequence.\n- Default review mode is full-image-first with no tiles.\n- --tiles <n> opt-in adds zoom crops for detail checks when needed.\n- --overview-quality: JPEG quality for overview image (1-100). Omit for full quality. Does not affect token cost.\n- Providers: openai, anthropic, openai-compatible, codex-cli, claude-cli, custom-cli`);
  process.exit(1);
}

export function appendPrompt(existing: string | undefined, addition: string): string {
  return existing ? `${existing}\n\n${addition}` : addition;
}

export function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const options: Partial<RuntimeOptions> = {};
  let noCache = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const next = argv[i + 1];
    switch (arg) {
      case "--provider": options.provider = next as ProviderKind; i += 1; break;
      case "--model": options.model = next; i += 1; break;
      case "--base-url": options.baseUrl = next; i += 1; break;
      case "--output": options.outputPath = next; i += 1; break;
      case "--tiles": options.tileCount = Number(next); i += 1; break;
      case "--overview-width": options.overviewWidth = Number(next); i += 1; break;
      case "--overview-quality": options.overviewQuality = Number(next); i += 1; break;
      case "--profile": options.profile = next; i += 1; break;
      case "--prompt-text": options.userPrompt = appendPrompt(options.userPrompt, next); i += 1; break;
      case "--prompt-file": options.userPrompt = appendPrompt(options.userPrompt, fs.readFileSync(path.resolve(next), "utf8")); i += 1; break;
      case "--keep-artifacts": options.keepArtifacts = true; break;
      case "--cache-read": options.cacheRead = true; break;
      case "--cache-write": options.cacheWrite = true; break;
      case "--no-cache": noCache = true; break;
      case "--force-provider": options.forceProvider = true; break;
      case "--concurrency": options.concurrency = Number(next); i += 1; break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (noCache) {
    options.cacheRead = false;
    options.cacheWrite = false;
  }

  if (positional.length !== 1) printUsageAndExit();
  return { target: positional[0], options };
}

export function detectDefaultProvider(): ProviderKind {
  const explicit = process.env.VISION_CHECKER_PROVIDER as ProviderKind | undefined;
  if (explicit) return explicit;
  if (process.env.VISION_CHECKER_CLAUDE_COMMAND) return "claude-cli";
  if (process.env.VISION_CHECKER_API_KEY || process.env.OPENROUTER_API_KEY || process.env.VISION_CHECKER_BASE_URL) {
    return "openai-compatible";
  }
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "codex-cli";
}

export function buildRuntimeOptions(partial: Partial<RuntimeOptions>): RuntimeOptions {
  return {
    provider: partial.provider ?? detectDefaultProvider(),
    model: partial.model,
    baseUrl: partial.baseUrl,
    outputPath: partial.outputPath,
    userPrompt: partial.userPrompt,
    overviewWidth: partial.overviewWidth && partial.overviewWidth > 0 ? partial.overviewWidth : 1280,
    tileCount: partial.tileCount !== undefined && partial.tileCount >= 0 ? Math.floor(partial.tileCount) : 0,
    overviewQuality: partial.overviewQuality,
    profile: partial.profile,
    keepArtifacts: Boolean(partial.keepArtifacts),
    cacheRead: partial.cacheRead ?? true,
    cacheWrite: partial.cacheWrite ?? true,
    forceProvider: Boolean(partial.forceProvider),
    concurrency: partial.concurrency && partial.concurrency > 0 ? Math.floor(partial.concurrency) : 2,
  };
}

export function buildCacheMetadata(options: RuntimeOptions, imagePath: string): CacheMetadata {
  const normalizedPrompt = normalizePromptForCache(options.userPrompt) ?? "";
  const promptHash = sha256(normalizedPrompt);
  const assetHashes = [hashFileContents(imagePath)];
  const key = buildVisionCacheKey({
    provider: options.provider,
    model: options.model,
    baseUrl: options.baseUrl,
    profile: options.profile,
    prompt: normalizedPrompt,
    assets: assetHashes.map((hash) => ({ hash })),
    options: {
      overviewWidth: options.overviewWidth,
      overviewQuality: options.overviewQuality,
      tileCount: options.tileCount,
    },
  });

  return {
    key,
    hit: false,
    path: getVisionCachePath(key),
    promptHash,
    assetHashes,
    readEnabled: options.cacheRead,
    writeEnabled: options.cacheWrite,
  };
}

export function finalizeAssessmentResult(
  result: AssessmentResult,
  reportPath: string,
  keepArtifacts: boolean,
  cache: CacheMetadata,
  modeOverride?: AssessmentResult["execution"]["mode"],
): AssessmentResult {
  const finalized: AssessmentResult = JSON.parse(JSON.stringify(result)) as AssessmentResult;
  finalized.cache = cache;
  finalized.execution = {
    mode: modeOverride ?? result.execution?.mode ?? "provider",
    reportPath,
    artifactsKept: keepArtifacts,
    artifactsCleaned: !keepArtifacts,
  };

  if (!keepArtifacts) {
    delete finalized.artifacts;
  }

  return finalized;
}

function cleanupArtifacts(result: AssessmentResult, keepArtifacts: boolean): void {
  if (keepArtifacts) return;
  const workDir = result.artifacts?.overviewPath ? path.dirname(path.dirname(result.artifacts.overviewPath)) : undefined;
  if (workDir && fs.existsSync(workDir)) {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

export async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function reviewOne(imagePath: string, options: RuntimeOptions, reportPath: string): Promise<AssessmentResult> {
  const cache = buildCacheMetadata(options, imagePath);
  if (options.cacheRead && cache.path) {
    const cached = readVisionCache(cache.path);
    if (cached?.result) {
      return finalizeAssessmentResult(cached.result, reportPath, options.keepArtifacts, { ...cache, hit: true }, "cache-hit");
    }
  }

  const signals = await runPrecheck(imagePath);
  const assets = await prepareReviewAssets(imagePath, options.overviewWidth, options.tileCount, options.overviewQuality);
  const reviewed = await reviewWithProvider(assets, signals, options);
  const finalized = finalizeAssessmentResult(reviewed, reportPath, options.keepArtifacts, cache, reviewed.execution?.mode);

  if (options.cacheWrite && cache.path) {
    writeVisionCache(cache.path, cache.key!, finalized);
  }

  cleanupArtifacts(reviewed, options.keepArtifacts);
  return finalized;
}

async function reviewMany(targetPath: string, imagePaths: string[], options: RuntimeOptions, reportPath: string): Promise<BatchAssessmentResult> {
  const results = await mapWithConcurrency(imagePaths, options.concurrency, async (imagePath) => reviewOne(imagePath, options, reportPath));
  const passCount = results.filter((result) => result.pass).length;
  return {
    batch: true,
    target: path.resolve(targetPath),
    total: results.length,
    passCount,
    failCount: results.length - passCount,
    concurrency: options.concurrency,
    results,
  };
}

async function main() {
  try {
    const { target, options: partial } = parseArgs(process.argv.slice(2));
    const options = buildRuntimeOptions(partial);
    const imagePaths = resolveImageTargets(target);
    const reportPath = options.outputPath ?? createReportPath();
    const output: VisionCheckResult = imagePaths.length === 1
      ? await reviewOne(imagePaths[0], options, reportPath)
      : await reviewMany(target, imagePaths, options, reportPath);

    const serialized = JSON.stringify(output, null, 2);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, serialized + "\n");
    process.stdout.write(serialized + "\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(message + "\n");
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
