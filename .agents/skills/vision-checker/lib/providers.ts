import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { parseLooseJson } from "./json";
import type { AssessmentResult, PrecheckSignals, ReviewAssets, RuntimeOptions } from "./types";

const execFileAsync = promisify(execFile);

interface ModelJson {
  pass: boolean;
  confidence: number;
  issues: string[];
  summary?: string;
}

export function unwrapModelJson(input: unknown): ModelJson {
  const candidate = (input && typeof input === "object" && "structured_output" in input)
    ? (input as { structured_output?: unknown }).structured_output
    : input;

  return candidate as ModelJson;
}

const RESULT_SCHEMA = {
  type: "object",
  properties: {
    pass: { type: "boolean" },
    confidence: { type: "number" },
    issues: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
  required: ["pass", "confidence", "issues", "summary"],
  additionalProperties: false,
};

function toDataUrl(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mediaType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  const base64 = fs.readFileSync(filePath).toString("base64");
  return `data:${mediaType};base64,${base64}`;
}

export function buildPrompt(signals: PrecheckSignals, userPrompt?: string, tileCount = 0): string {
  const warnings = signals.warnings.length ? signals.warnings.map((x) => `- ${x}`).join("\n") : "- none";
  const parts = [
    "You are a cheap UI screenshot checker.",
    "Judge only whether the rendered UI appears successful enough for a screenshot review.",
    "The full screenshot overview is the primary evidence for pass/fail decisions.",
    tileCount > 0
      ? "Optional native 1x tiles are zoom aids for small text and dense details. Do not fail the screen only because a tile crop cuts through a component boundary; confirm clipping or overflow against the full screenshot first."
      : "No zoom tiles are attached for this run. Judge using only the full screenshot.",
    "Do not give broad design critique or implementation advice.",
    "Return JSON only with keys: pass(boolean), confidence(number 0..1), issues(string[]), summary(string).",
    "Mark pass=false for blank screens, obvious broken layouts, missing major content, clipped critical UI, severe overflow, or obvious error states.",
    `Known precheck warnings:\n${warnings}`,
  ];

  if (userPrompt?.trim()) {
    parts.push(`User-specific review instructions:\n${userPrompt.trim()}`);
  }

  return parts.join("\n");
}

function normalizeResult(
  parsed: ModelJson,
  screenshot: string,
  provider: string,
  model: string,
  signals: PrecheckSignals,
  assets: ReviewAssets,
  rawResponse?: string,
): AssessmentResult {
  return {
    pass: Boolean(parsed.pass),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0))),
    screenshot,
    provider,
    model,
    issues: Array.isArray(parsed.issues) ? parsed.issues.map(String).slice(0, 8) : [],
    summary: typeof parsed.summary === "string" ? parsed.summary : undefined,
    signals,
    artifacts: {
      overviewPath: assets.overviewPath,
      tilePaths: assets.tilePaths,
    },
    rawResponse,
    execution: {
      mode: "provider",
      artifactsKept: true,
      artifactsCleaned: false,
    },
  };
}

async function parseWithRetry<T>(fn: (strict: boolean) => Promise<string>): Promise<{ parsed: T; raw: string }> {
  let lastError: unknown;
  for (const strict of [false, true]) {
    try {
      const raw = await fn(strict);
      return { parsed: parseLooseJson<T>(raw), raw };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function postJson(url: string, headers: Record<string, string>, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) ${await response.text()}`);
  }

  return response.json() as Promise<any>;
}

export function resolveOpenAICompatibleApiKey(): string | undefined {
  return process.env.VISION_CHECKER_API_KEY
    ?? process.env.OPENROUTER_API_KEY
    ?? process.env.OPENAI_API_KEY;
}

export function resolveOpenAICompatibleBaseUrl(cliBaseUrl?: string): string | undefined {
  return cliBaseUrl
    ?? process.env.VISION_CHECKER_BASE_URL
    ?? (process.env.OPENROUTER_API_KEY ? "https://openrouter.ai/api/v1" : undefined);
}

export function buildOpenAICompatiblePayload(
  model: string,
  assets: ReviewAssets,
  signals: PrecheckSignals,
  options: RuntimeOptions,
  strict = false,
) {
  const prompt = buildPrompt(signals, options.userPrompt, assets.tilePaths.length) + (strict ? "\nReturn a single valid JSON object only." : "");
  return {
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          ...[assets.overviewPath, ...assets.tilePaths].map((filePath) => ({
            type: "image_url",
            image_url: { url: toDataUrl(filePath), detail: filePath === assets.overviewPath ? "low" : "high" },
          })),
          { type: "text", text: prompt },
        ],
      },
    ],
  };
}

export function buildOpenAIPayload(
  model: string,
  assets: ReviewAssets,
  signals: PrecheckSignals,
  options: RuntimeOptions,
  strict = false,
) {
  const prompt = buildPrompt(signals, options.userPrompt, assets.tilePaths.length) + (strict ? "\nReturn a single valid JSON object only." : "");
  return {
    model,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: toDataUrl(assets.overviewPath), detail: "low" },
          ...assets.tilePaths.map((filePath) => ({ type: "input_image", image_url: toDataUrl(filePath), detail: "high" })),
        ],
      },
    ],
  };
}

export function buildAnthropicPayload(
  model: string,
  assets: ReviewAssets,
  signals: PrecheckSignals,
  options: RuntimeOptions,
  strict = false,
) {
  const prompt = buildPrompt(signals, options.userPrompt, assets.tilePaths.length) + (strict ? "\nReturn a single valid JSON object only." : "");
  const toImageBlock = (filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();
    const mediaType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: fs.readFileSync(filePath).toString("base64"),
      },
    };
  };

  return {
    model,
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: [toImageBlock(assets.overviewPath), ...assets.tilePaths.map(toImageBlock), { type: "text", text: prompt }],
      },
    ],
  };
}

async function callOpenAICompatible(
  endpointBase: string,
  apiKey: string,
  model: string,
  assets: ReviewAssets,
  signals: PrecheckSignals,
  options: RuntimeOptions,
): Promise<{ parsed: ModelJson; raw: string }> {
  let capturedUsage: unknown;

  const result = await parseWithRetry<ModelJson>(async (strict) => {
    const payload = buildOpenAICompatiblePayload(model, assets, signals, options, strict);
    const json = await postJson(`${endpointBase.replace(/\/$/, "")}/chat/completions`, { Authorization: `Bearer ${apiKey}` }, payload);
    capturedUsage = json?.usage;
    return json?.choices?.[0]?.message?.content ?? "";
  });

  return { parsed: result.parsed, raw: JSON.stringify({ content: result.raw, usage: capturedUsage }) };
}

async function callOpenAI(
  apiKey: string,
  model: string,
  assets: ReviewAssets,
  signals: PrecheckSignals,
  options: RuntimeOptions,
): Promise<{ parsed: ModelJson; raw: string }> {
  return parseWithRetry<ModelJson>(async (strict) => {
    const payload = buildOpenAIPayload(model, assets, signals, options, strict);
    const json = await postJson("https://api.openai.com/v1/responses", { Authorization: `Bearer ${apiKey}` }, payload);
    return json.output_text ?? "";
  });
}

async function callAnthropic(
  apiKey: string,
  model: string,
  assets: ReviewAssets,
  signals: PrecheckSignals,
  options: RuntimeOptions,
): Promise<{ parsed: ModelJson; raw: string }> {
  return parseWithRetry<ModelJson>(async (strict) => {
    const payload = buildAnthropicPayload(model, assets, signals, options, strict);
    const json = await postJson(
      "https://api.anthropic.com/v1/messages",
      {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      payload,
    );
    const joined = Array.isArray(json?.content)
      ? json.content.filter((item: any) => item?.type === "text").map((item: any) => item.text).join("\n")
      : "";
    return joined;
  });
}

async function callCodexCli(
  model: string | undefined,
  profile: string | undefined,
  assets: ReviewAssets,
  signals: PrecheckSignals,
  options: RuntimeOptions,
): Promise<{ parsed: ModelJson; raw: string }> {
  const schemaPath = path.join(assets.workDir, "codex-output-schema.json");
  const outputPath = path.join(assets.workDir, "codex-output.json");
  const promptPath = path.join(assets.workDir, "codex-prompt.txt");
  fs.writeFileSync(schemaPath, JSON.stringify(RESULT_SCHEMA, null, 2));
  fs.writeFileSync(promptPath, buildPrompt(signals, options.userPrompt, assets.tilePaths.length));

  const args = [
    "exec",
    "--skip-git-repo-check",
    "--ephemeral",
    "--ignore-user-config",
    "--ignore-rules",
    "--color",
    "never",
    "--json",
    "-C",
    process.cwd(),
    "--output-schema",
    schemaPath,
    "-o",
    outputPath,
  ];

  if (profile) args.push("-p", profile);
  if (model) args.push("-m", model);

  for (const imagePath of [assets.overviewPath, ...assets.tilePaths]) {
    args.push("-i", imagePath);
  }
  args.push("-");

  const command = `${["codex", ...args].map(shellEscape).join(" ")} < ${shellEscape(promptPath)}`;
  const { stdout } = await execFileAsync("bash", ["-lc", command], {
    cwd: process.cwd(),
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });

  let capturedUsage: unknown;
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as { type?: string; usage?: unknown };
      if (event.type === "turn.completed" && event.usage) {
        capturedUsage = event.usage;
      }
    } catch { /* skip non-JSON lines */ }
  }

  const raw = fs.readFileSync(outputPath, "utf8");
  return { parsed: unwrapModelJson(parseLooseJson<unknown>(raw)), raw: JSON.stringify({ content: raw, usage: capturedUsage }) };
}

function shellEscape(input: string): string {
  return `'${input.replace(/'/g, `'\\''`)}'`;
}

async function callTemplateCli(
  template: string,
  assets: ReviewAssets,
  signals: PrecheckSignals,
  options: RuntimeOptions,
): Promise<{ parsed: ModelJson; raw: string }> {
  const schemaPath = path.join(assets.workDir, "cli-output-schema.json");
  const promptPath = path.join(assets.workDir, "cli-prompt.txt");
  const outputPath = path.join(assets.workDir, "cli-output.json");
  fs.writeFileSync(schemaPath, JSON.stringify(RESULT_SCHEMA, null, 2));
  fs.writeFileSync(promptPath, buildPrompt(signals, options.userPrompt, assets.tilePaths.length));

  const imageFlags = [assets.overviewPath, ...assets.tilePaths].map(shellEscape).join(" ");
  const command = template
    .replaceAll("{{prompt_file}}", shellEscape(promptPath))
    .replaceAll("{{schema_file}}", shellEscape(schemaPath))
    .replaceAll("{{output_file}}", shellEscape(outputPath))
    .replaceAll("{{image_flags}}", imageFlags)
    .replaceAll("{{cwd}}", shellEscape(process.cwd()));

  await execFileAsync("bash", ["-lc", command], {
    cwd: process.cwd(),
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });

  const raw = fs.readFileSync(outputPath, "utf8");
  return { parsed: unwrapModelJson(parseLooseJson<unknown>(raw)), raw };
}

export async function reviewWithProvider(
  assets: ReviewAssets,
  signals: PrecheckSignals,
  options: RuntimeOptions,
): Promise<AssessmentResult> {
  if (!options.forceProvider && signals.blankLike && signals.consoleErrors === 0 && signals.pageErrors === 0 && signals.requestFailures === 0) {
    return {
      pass: false,
      confidence: 0.99,
      screenshot: assets.screenshotPath,
      provider: "precheck",
      model: "deterministic",
      issues: ["Screenshot appears near-blank or monochrome."],
      summary: "Precheck failed before model call.",
      signals,
      artifacts: { overviewPath: assets.overviewPath, tilePaths: assets.tilePaths },
      execution: {
        mode: "precheck-fast-fail",
        artifactsKept: true,
        artifactsCleaned: false,
      },
    };
  }

  const provider = options.provider;
  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is required for provider=openai");
    const model = options.model ?? process.env.VISION_CHECKER_MODEL ?? "gpt-5.4-nano";
    const result = await callOpenAI(key, model, assets, signals, options);
    return normalizeResult(result.parsed, assets.screenshotPath, provider, model, signals, assets, result.raw);
  }

  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is required for provider=anthropic");
    const model = options.model ?? process.env.VISION_CHECKER_MODEL ?? "claude-4-5-haiku";
    const result = await callAnthropic(key, model, assets, signals, options);
    return normalizeResult(result.parsed, assets.screenshotPath, provider, model, signals, assets, result.raw);
  }

  if (provider === "openai-compatible") {
    const key = resolveOpenAICompatibleApiKey();
    if (!key) {
      throw new Error("VISION_CHECKER_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY is required for provider=openai-compatible");
    }
    const baseUrl = resolveOpenAICompatibleBaseUrl(options.baseUrl);
    if (!baseUrl) throw new Error("VISION_CHECKER_BASE_URL or --base-url is required for provider=openai-compatible");
    const model = options.model ?? process.env.VISION_CHECKER_MODEL ?? "gpt-5.4-mini";
    const result = await callOpenAICompatible(baseUrl, key, model, assets, signals, options);
    return normalizeResult(result.parsed, assets.screenshotPath, provider, model, signals, assets, result.raw);
  }

  if (provider === "codex-cli") {
    const profile = options.profile ?? (process.env.VISION_CHECKER_PROFILE || undefined);
    const model = options.model ?? process.env.VISION_CHECKER_MODEL ?? "gpt-5.4-nano";
    const result = await callCodexCli(model, profile, assets, signals, options);
    return normalizeResult(result.parsed, assets.screenshotPath, provider, model, signals, assets, result.raw);
  }

  if (provider === "claude-cli") {
    const template = process.env.VISION_CHECKER_CLAUDE_COMMAND;
    if (!template) {
      throw new Error(
        "provider=claude-cli requires VISION_CHECKER_CLAUDE_COMMAND. Claude Code does not expose an official local image flag in non-interactive mode, so this provider is implemented as a command-template wrapper.",
      );
    }
    const model = options.model ?? process.env.VISION_CHECKER_MODEL ?? "claude-haiku-4-5";
    const result = await callTemplateCli(template, assets, signals, options);
    return normalizeResult(result.parsed, assets.screenshotPath, provider, model, signals, assets, result.raw);
  }

  const template = process.env.VISION_CHECKER_CUSTOM_CLI_COMMAND;
  if (!template) {
    throw new Error("provider=custom-cli requires VISION_CHECKER_CUSTOM_CLI_COMMAND");
  }
  const result = await callTemplateCli(template, assets, signals, options);
  return normalizeResult(result.parsed, assets.screenshotPath, provider, options.model ?? "custom-cli", signals, assets, result.raw);
}
