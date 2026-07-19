import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";
import {
  buildVisionCacheKey,
  buildVisionCacheKeyFromFiles,
  buildVisionCachePayload,
  createReportPath,
  getVisionCachePath,
  normalizePromptForCache,
  readVisionCache,
  writeVisionCache,
} from "../lib/cache";
import { prepareReviewAssets } from "../lib/image-prep";
import { parseLooseJson } from "../lib/json";
import { runPrecheck } from "../lib/precheck";
import {
  buildAnthropicPayload,
  buildOpenAICompatiblePayload,
  buildOpenAIPayload,
  buildPrompt,
  resolveOpenAICompatibleApiKey,
  resolveOpenAICompatibleBaseUrl,
  reviewWithProvider,
  unwrapModelJson,
} from "../lib/providers";
import { resolveImageTargets } from "../lib/targets";
import type { AssessmentResult, RuntimeOptions } from "../lib/types";
import {
  appendPrompt,
  buildCacheMetadata,
  buildRuntimeOptions,
  detectDefaultProvider,
  finalizeAssessmentResult,
  mapWithConcurrency,
  parseArgs,
} from "../check-image";

function makeOptions(partial: Partial<RuntimeOptions> = {}): RuntimeOptions {
  return buildRuntimeOptions({ provider: "openai-compatible", ...partial });
}

test("parseLooseJson extracts fenced JSON", () => {
  const parsed = parseLooseJson<{ pass: boolean }>("```json\n{\"pass\":true}\n```");
  assert.equal(parsed.pass, true);
});

test("prepareReviewAssets keeps original image untouched and writes overview/tiles", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-vision-test-"));
  const imagePath = path.join(dir, "sample.png");
  await sharp({ create: { width: 1920, height: 1080, channels: 3, background: { r: 250, g: 250, b: 250 } } })
    .png()
    .toFile(imagePath);

  const before = fs.statSync(imagePath).mtimeMs;
  const assets = await prepareReviewAssets(imagePath, 1280, 3);

  assert.equal(fs.existsSync(assets.overviewPath), true);
  assert.equal(assets.tilePaths.length, 3);
  assert.equal(fs.statSync(imagePath).mtimeMs, before);
});

test("prepareReviewAssets applies overviewQuality when specified", async () => {
  const noise = Buffer.alloc(1920 * 1080 * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = Math.floor(Math.random() * 256);

  const dirHq = fs.mkdtempSync(path.join(os.tmpdir(), "ui-vision-hq-"));
  const dirLq = fs.mkdtempSync(path.join(os.tmpdir(), "ui-vision-lq-"));
  const imageHq = path.join(dirHq, "noisy.png");
  const imageLq = path.join(dirLq, "noisy.png");
  await sharp(noise, { raw: { width: 1920, height: 1080, channels: 3 } }).png().toFile(imageHq);
  await sharp(noise, { raw: { width: 1920, height: 1080, channels: 3 } }).png().toFile(imageLq);

  const assetsHq = await prepareReviewAssets(imageHq, 1280, 1);
  const assetsLq = await prepareReviewAssets(imageLq, 1280, 1, 10);

  const sizeHq = fs.statSync(assetsHq.overviewPath).size;
  const sizeLq = fs.statSync(assetsLq.overviewPath).size;
  assert.ok(sizeLq < sizeHq, `low-quality (${sizeLq}B) should be smaller than full-quality (${sizeHq}B)`);
});

test("prepareReviewAssets supports overview-only mode when tileCount is zero", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-vision-overview-only-"));
  const imagePath = path.join(dir, "sample.png");
  await sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 240, g: 240, b: 240 } } })
    .png()
    .toFile(imagePath);

  const assets = await prepareReviewAssets(imagePath, 1280, 0);
  assert.equal(fs.existsSync(assets.overviewPath), true);
  assert.deepEqual(assets.tilePaths, []);
  assert.equal(fs.existsSync(path.join(assets.workDir, "tiles")), false);
});

test("runPrecheck flags blank images", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-vision-test-"));
  const imagePath = path.join(dir, "blank.png");
  await sharp({ create: { width: 1920, height: 1080, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .png()
    .toFile(imagePath);

  const result = await runPrecheck(imagePath);
  assert.equal(result.blankLike, true);
  assert.equal(result.width, 1920);
  assert.equal(result.height, 1080);
});

test("openai-compatible provider falls back to OPENROUTER_API_KEY and default base URL", () => {
  const original = {
    VISION_CHECKER_API_KEY: process.env.VISION_CHECKER_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    VISION_CHECKER_BASE_URL: process.env.VISION_CHECKER_BASE_URL,
  };

  try {
    delete process.env.VISION_CHECKER_API_KEY;
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    delete process.env.OPENAI_API_KEY;
    delete process.env.VISION_CHECKER_BASE_URL;

    assert.equal(resolveOpenAICompatibleApiKey(), "test-openrouter-key");
    assert.equal(resolveOpenAICompatibleBaseUrl(), "https://openrouter.ai/api/v1");
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("detectDefaultProvider prefers openai-compatible when OPENROUTER_API_KEY is set", () => {
  const original = {
    VISION_CHECKER_PROVIDER: process.env.VISION_CHECKER_PROVIDER,
    VISION_CHECKER_CLAUDE_COMMAND: process.env.VISION_CHECKER_CLAUDE_COMMAND,
    VISION_CHECKER_API_KEY: process.env.VISION_CHECKER_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    VISION_CHECKER_BASE_URL: process.env.VISION_CHECKER_BASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  };

  try {
    delete process.env.VISION_CHECKER_PROVIDER;
    delete process.env.VISION_CHECKER_CLAUDE_COMMAND;
    delete process.env.VISION_CHECKER_API_KEY;
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    delete process.env.VISION_CHECKER_BASE_URL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    assert.equal(detectDefaultProvider(), "openai-compatible");
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("unwrapModelJson extracts structured_output from claude json wrapper", () => {
  const wrapped = {
    type: "result",
    structured_output: {
      pass: true,
      confidence: 0.9,
      issues: [],
      summary: "ok",
    },
  };

  const parsed = unwrapModelJson(wrapped);
  assert.equal(parsed.pass, true);
  assert.equal(parsed.summary, "ok");
});

test("resolveImageTargets accepts a directory and returns sorted image files only", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-vision-dir-"));
  const frame10 = path.join(dir, "frame-10.png");
  const frame2 = path.join(dir, "frame-2.png");
  const notes = path.join(dir, "notes.txt");

  await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } } }).png().toFile(frame10);
  await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } } }).png().toFile(frame2);
  fs.writeFileSync(notes, "ignore");

  const targets = resolveImageTargets(dir);
  assert.deepEqual(targets.map((file) => path.basename(file)), ["frame-2.png", "frame-10.png"]);
});

test("resolveImageTargets rejects a directory with no supported image files", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-vision-empty-"));
  fs.writeFileSync(path.join(dir, "notes.txt"), "ignore");

  assert.throws(() => resolveImageTargets(dir), /No supported image files found in directory/);
});

test("appendPrompt returns addition when existing is undefined", () => {
  assert.equal(appendPrompt(undefined, "check layout"), "check layout");
});

test("appendPrompt concatenates two prompts with double newline", () => {
  assert.equal(appendPrompt("check layout", "check fonts"), "check layout\n\ncheck fonts");
});

test("appendPrompt accumulates three prompts in order", () => {
  const step1 = appendPrompt(undefined, "A");
  const step2 = appendPrompt(step1, "B");
  const step3 = appendPrompt(step2, "C");
  assert.equal(step3, "A\n\nB\n\nC");
});

test("appendPrompt mixed --prompt-text and --prompt-file order is preserved", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-vision-test-"));
  const filePath = path.join(dir, "rules.md");
  fs.writeFileSync(filePath, "file content");

  const fromText1 = appendPrompt(undefined, "first text");
  const fromFile = appendPrompt(fromText1, fs.readFileSync(filePath, "utf8"));
  const fromText2 = appendPrompt(fromFile, "last text");

  assert.equal(fromText2, "first text\n\nfile content\n\nlast text");
});

test("normalizePromptForCache trims outer whitespace, trailing spaces, and CRLF noise", () => {
  assert.equal(normalizePromptForCache("\n  first line  \r\nsecond line\t\r\n\r\n"), "first line\nsecond line");
});

test("buildVisionCachePayload sorts option keys for deterministic hashing", () => {
  const payload = buildVisionCachePayload({
    provider: "openai-compatible",
    model: "openai/gpt-5.4-nano",
    prompt: "alpha\n",
    options: { temperature: 0, nested: { b: 2, a: 1 } },
  });

  assert.deepEqual(payload, {
    version: "v2",
    provider: "openai-compatible",
    model: "openai/gpt-5.4-nano",
    prompt: "alpha",
    options: { nested: { a: 1, b: 2 }, temperature: 0 },
  });
});

test("buildVisionCacheKey stays stable when prompt file paths change but content stays the same", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-vision-cache-"));
  const fileA = path.join(dir, "rules-a.md");
  const fileB = path.join(dir, "nested", "rules-b.md");
  fs.mkdirSync(path.dirname(fileB), { recursive: true });
  fs.writeFileSync(fileA, "shared rules\n");
  fs.writeFileSync(fileB, "shared rules\r\n");

  const keyA = buildVisionCacheKey({
    provider: "openai-compatible",
    model: "openai/gpt-5.4-nano",
    prompt: appendPrompt(undefined, fs.readFileSync(fileA, "utf8")),
    assets: [{ hash: "img-1" }],
  });
  const keyB = buildVisionCacheKey({
    provider: "openai-compatible",
    model: "openai/gpt-5.4-nano",
    prompt: appendPrompt(undefined, fs.readFileSync(fileB, "utf8")),
    assets: [{ hash: "img-1" }],
  });

  assert.equal(keyA, keyB);
});

test("buildVisionCacheKeyFromFiles stays stable when asset file paths change but bytes stay the same", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-vision-asset-cache-"));
  const assetA = path.join(dir, "asset-a.bin");
  const assetB = path.join(dir, "nested", "asset-b.bin");
  fs.mkdirSync(path.dirname(assetB), { recursive: true });
  fs.writeFileSync(assetA, Buffer.from([0, 1, 2, 3]));
  fs.writeFileSync(assetB, Buffer.from([0, 1, 2, 3]));

  const keyA = buildVisionCacheKeyFromFiles({
    provider: "openai-compatible",
    model: "openai/gpt-5.4-nano",
    prompt: "shared rules",
    assetPaths: [assetA],
  });
  const keyB = buildVisionCacheKeyFromFiles({
    provider: "openai-compatible",
    model: "openai/gpt-5.4-nano",
    prompt: "shared rules",
    assetPaths: [assetB],
  });

  assert.equal(keyA, keyB);
});

test("buildVisionCacheKey changes when prompt order changes", () => {
  const base = {
    provider: "openai-compatible",
    model: "openai/gpt-5.4-nano",
    assets: [{ hash: "img-1" }],
  };

  const keyA = buildVisionCacheKey({ ...base, prompt: "A\n\nB" });
  const keyB = buildVisionCacheKey({ ...base, prompt: "B\n\nA" });

  assert.notEqual(keyA, keyB);
});

test("buildVisionCacheKey changes when runtime options change", () => {
  const keyA = buildVisionCacheKey({
    provider: "openai-compatible",
    model: "openai/gpt-5.4-nano",
    prompt: "shared rules",
    assets: [{ hash: "img-1" }],
    options: { overviewWidth: 1280, tileCount: 5 },
  });

  const keyB = buildVisionCacheKey({
    provider: "openai-compatible",
    model: "openai/gpt-5.4-nano",
    prompt: "shared rules",
    assets: [{ hash: "img-1" }],
    options: { overviewWidth: 1440, tileCount: 5 },
  });

  assert.notEqual(keyA, keyB);
});

test("parseArgs enforces no-cache precedence and force-provider", () => {
  const parsed = parseArgs(["image.png", "--cache-read", "--cache-write", "--no-cache", "--force-provider", "--concurrency", "4"]);
  assert.equal(parsed.target, "image.png");
  assert.equal(parsed.options.cacheRead, false);
  assert.equal(parsed.options.cacheWrite, false);
  assert.equal(parsed.options.forceProvider, true);
  assert.equal(parsed.options.concurrency, 4);
});

test("buildRuntimeOptions fills defaults", () => {
  const options = buildRuntimeOptions({ provider: "openai-compatible" });
  assert.equal(options.cacheRead, true);
  assert.equal(options.cacheWrite, true);
  assert.equal(options.forceProvider, false);
  assert.equal(options.concurrency, 2);
  assert.equal(options.tileCount, 0);
});

test("buildCacheMetadata uses content not filenames", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-vision-cache-meta-"));
  const fileA = path.join(dir, "a.png");
  const fileB = path.join(dir, "b.png");
  await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 10, g: 20, b: 30 } } }).png().toFile(fileA);
  fs.copyFileSync(fileA, fileB);

  const options = makeOptions({ userPrompt: "same prompt" });
  const metaA = buildCacheMetadata(options, fileA);
  const metaB = buildCacheMetadata(options, fileB);
  assert.equal(metaA.key, metaB.key);
  assert.deepEqual(metaA.assetHashes, metaB.assetHashes);
});

test("createReportPath generates unique json files under reports dir", () => {
  const a = createReportPath();
  const b = createReportPath();
  assert.notEqual(a, b);
  assert.match(a, /reports\/.*\.json$/);
});

test("writeVisionCache and readVisionCache roundtrip", () => {
  const cachePath = getVisionCachePath(`test-${Date.now()}`);
  const result: AssessmentResult = {
    pass: true,
    confidence: 1,
    screenshot: "/tmp/example.png",
    provider: "precheck",
    model: "deterministic",
    issues: [],
    signals: { width: 1, height: 1, blankLike: false, lowVariance: false, consoleErrors: 0, pageErrors: 0, requestFailures: 0, viewportMatches: null, warnings: [] },
  };
  writeVisionCache(cachePath, "abc", result);
  const record = readVisionCache(cachePath);
  assert.equal(record?.key, "abc");
  assert.equal(record?.result.provider, "precheck");
});

test("finalizeAssessmentResult strips artifacts when not kept and marks cache-hit mode", () => {
  const result: AssessmentResult = {
    pass: true,
    confidence: 0.8,
    screenshot: "/tmp/example.png",
    provider: "openai-compatible",
    model: "gpt",
    issues: [],
    signals: { width: 10, height: 10, blankLike: false, lowVariance: false, consoleErrors: 0, pageErrors: 0, requestFailures: 0, viewportMatches: null, warnings: [] },
    artifacts: { overviewPath: "/tmp/overview.jpg", tilePaths: ["/tmp/tile.png"] },
  };

  const finalized = finalizeAssessmentResult(result, "/tmp/report.json", false, {
    key: "k",
    hit: true,
    path: "/tmp/cache.json",
    promptHash: "p",
    assetHashes: ["a"],
    readEnabled: true,
    writeEnabled: true,
  }, "cache-hit");

  assert.equal(finalized.execution?.mode, "cache-hit");
  assert.equal(finalized.execution?.artifactsCleaned, true);
  assert.equal(finalized.artifacts, undefined);
});

test("mapWithConcurrency preserves order", async () => {
  const result = await mapWithConcurrency([30, 10, 20], 2, async (value) => {
    await new Promise((resolve) => setTimeout(resolve, value));
    return value;
  });
  assert.deepEqual(result, [30, 10, 20]);
});

test("buildPrompt includes warnings and user prompt", () => {
  const prompt = buildPrompt({ width: 1, height: 1, blankLike: true, lowVariance: true, consoleErrors: 0, pageErrors: 0, requestFailures: 0, viewportMatches: null, warnings: ["warn A"] }, "custom rule");
  assert.match(prompt, /warn A/);
  assert.match(prompt, /custom rule/);
  assert.match(prompt, /No zoom tiles are attached/);
});

test("buildPrompt explains optional tile behavior when zoom tiles are attached", () => {
  const prompt = buildPrompt({ width: 1, height: 1, blankLike: false, lowVariance: false, consoleErrors: 0, pageErrors: 0, requestFailures: 0, viewportMatches: null, warnings: [] }, "custom rule", 3);
  assert.match(prompt, /Optional native 1x tiles are zoom aids/);
  assert.match(prompt, /confirm clipping or overflow against the full screenshot first/);
});

test("provider payload builders place prompt and images in expected shapes", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-vision-payload-"));
  const imagePath = path.join(dir, "sample.png");
  await sharp({ create: { width: 20, height: 20, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toFile(imagePath);
  const assets = await prepareReviewAssets(imagePath, 1280, 2);
  const signals = { width: 20, height: 20, blankLike: false, lowVariance: false, consoleErrors: 0, pageErrors: 0, requestFailures: 0, viewportMatches: null, warnings: [] };
  const options = makeOptions({ userPrompt: "check text" });

  const compat = buildOpenAICompatiblePayload("model-a", assets, signals, options);
  assert.equal(compat.messages[0].content.at(-1)?.type, "text");
  assert.equal(compat.messages[0].content[0].image_url.detail, "low");
  assert.equal(compat.messages[0].content[1].image_url.detail, "high");

  const openai = buildOpenAIPayload("model-b", assets, signals, options);
  assert.equal(openai.input[0].content[0].type, "input_text");
  assert.equal(openai.input[0].content[1].detail, "low");

  const anthropic = buildAnthropicPayload("model-c", assets, signals, options);
  assert.equal(anthropic.messages[0].content[0].type, "image");
  assert.equal(anthropic.messages[0].content.at(-1)?.type, "text");
});

test("provider payload builders support overview-only mode without tiles", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-vision-payload-overview-only-"));
  const imagePath = path.join(dir, "sample.png");
  await sharp({ create: { width: 20, height: 20, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toFile(imagePath);
  const assets = await prepareReviewAssets(imagePath, 1280, 0);
  const signals = { width: 20, height: 20, blankLike: false, lowVariance: false, consoleErrors: 0, pageErrors: 0, requestFailures: 0, viewportMatches: null, warnings: [] };
  const options = makeOptions({ userPrompt: "check text" });

  const compat = buildOpenAICompatiblePayload("model-a", assets, signals, options);
  assert.equal(compat.messages[0].content.length, 2);
  assert.equal(compat.messages[0].content[0].image_url.detail, "low");

  const openai = buildOpenAIPayload("model-b", assets, signals, options);
  assert.equal(openai.input[0].content.length, 2);
  assert.equal(openai.input[0].content[1].detail, "low");

  const anthropic = buildAnthropicPayload("model-c", assets, signals, options);
  assert.equal(anthropic.messages[0].content.length, 2);
  assert.equal(anthropic.messages[0].content[0].type, "image");
});

test("reviewWithProvider fast-fails blank images by default", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-vision-fastfail-"));
  const imagePath = path.join(dir, "blank.png");
  await sharp({ create: { width: 50, height: 50, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toFile(imagePath);
  const assets = await prepareReviewAssets(imagePath, 1280, 1);
  const signals = await runPrecheck(imagePath);
  const result = await reviewWithProvider(assets, signals, makeOptions({ provider: "openai" }));
  assert.equal(result.provider, "precheck");
  assert.equal(result.execution?.mode, "precheck-fast-fail");
});

test("reviewWithProvider can bypass fast-fail with force-provider", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-vision-force-"));
  const imagePath = path.join(dir, "blank.png");
  await sharp({ create: { width: 50, height: 50, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toFile(imagePath);
  const assets = await prepareReviewAssets(imagePath, 1280, 1);
  const signals = await runPrecheck(imagePath);
  await assert.rejects(() => reviewWithProvider(assets, signals, makeOptions({ provider: "openai", forceProvider: true })), /OPENAI_API_KEY/);
});
