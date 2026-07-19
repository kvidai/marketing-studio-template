export type ProviderKind =
  | "openai"
  | "anthropic"
  | "openai-compatible"
  | "codex-cli"
  | "claude-cli"
  | "custom-cli";

export interface DiagnosticsMeta {
  viewport?: { width: number; height: number };
  consoleErrors?: string[];
  consoleWarnings?: string[];
  pageErrors?: string[];
  requestFailures?: Array<{ url: string; errorText: string }>;
  capturedAt?: string;
}

export interface PrecheckSignals {
  width: number;
  height: number;
  blankLike: boolean;
  lowVariance: boolean;
  consoleErrors: number;
  pageErrors: number;
  requestFailures: number;
  viewportMatches: boolean | null;
  metadataPath?: string;
  warnings: string[];
}

export interface ReviewAssets {
  workDir: string;
  screenshotPath: string;
  overviewPath: string;
  tilePaths: string[];
  width: number;
  height: number;
}

export interface CacheMetadata {
  key?: string;
  hit: boolean;
  path?: string;
  promptHash?: string;
  assetHashes?: string[];
  readEnabled: boolean;
  writeEnabled: boolean;
}

export interface ExecutionMetadata {
  mode: "provider" | "precheck-fast-fail" | "cache-hit";
  reportPath?: string;
  artifactsKept: boolean;
  artifactsCleaned: boolean;
}

export interface AssessmentResult {
  pass: boolean;
  confidence: number;
  screenshot: string;
  provider: string;
  model: string;
  issues: string[];
  summary?: string;
  signals: PrecheckSignals;
  artifacts?: {
    overviewPath?: string;
    tilePaths?: string[];
  };
  rawResponse?: string;
  cache?: CacheMetadata;
  execution?: ExecutionMetadata;
}

export interface BatchAssessmentResult {
  batch: true;
  target: string;
  total: number;
  passCount: number;
  failCount: number;
  concurrency: number;
  results: AssessmentResult[];
}

export type VisionCheckResult = AssessmentResult | BatchAssessmentResult;

export interface RuntimeOptions {
  provider: ProviderKind;
  model?: string;
  baseUrl?: string;
  outputPath?: string;
  userPrompt?: string;
  overviewWidth: number;
  tileCount: number;
  overviewQuality?: number;
  profile?: string;
  keepArtifacts: boolean;
  cacheRead: boolean;
  cacheWrite: boolean;
  forceProvider: boolean;
  concurrency: number;
}
