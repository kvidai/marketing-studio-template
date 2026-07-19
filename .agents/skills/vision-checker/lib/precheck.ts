import fs from "fs";
import path from "path";
import sharp from "sharp";
import type { DiagnosticsMeta, PrecheckSignals } from "./types";

export function findDiagnosticsPath(imagePath: string): string | undefined {
  const candidates = [
    `${imagePath}.meta.json`,
    imagePath.replace(/\.(png|jpe?g|webp)$/i, ".meta.json"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

export function loadDiagnostics(imagePath: string): DiagnosticsMeta | undefined {
  const metaPath = findDiagnosticsPath(imagePath);
  if (!metaPath) return undefined;

  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8")) as DiagnosticsMeta;
  } catch {
    return undefined;
  }
}

export async function runPrecheck(imagePath: string): Promise<PrecheckSignals> {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Screenshot not found: ${imagePath}`);
  }

  const image = sharp(imagePath, { failOn: "none" });
  const metadata = await image.metadata();
  const stats = await image.stats();

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height) {
    throw new Error(`Could not read image dimensions for: ${imagePath}`);
  }

  const diagnostics = loadDiagnostics(imagePath);
  const consoleErrors = diagnostics?.consoleErrors?.length ?? 0;
  const pageErrors = diagnostics?.pageErrors?.length ?? 0;
  const requestFailures = diagnostics?.requestFailures?.length ?? 0;

  const maxStdev = Math.max(...stats.channels.map((channel) => channel.stdev));
  const maxRange = Math.max(...stats.channels.map((channel) => channel.max - channel.min));
  const lowVariance = maxStdev < 6;
  const blankLike = maxStdev < 2.5 && maxRange < 12;

  const expectedViewport = diagnostics?.viewport;
  const viewportMatches = expectedViewport
    ? expectedViewport.width === width || expectedViewport.height === height
    : null;

  const warnings: string[] = [];
  if (width < 600 || height < 300) warnings.push("Image is unusually small for UI review.");
  if (blankLike) warnings.push("Image appears near-blank or monochrome.");
  if (consoleErrors > 0) warnings.push(`Console errors captured: ${consoleErrors}`);
  if (pageErrors > 0) warnings.push(`Page errors captured: ${pageErrors}`);
  if (requestFailures > 0) warnings.push(`Request failures captured: ${requestFailures}`);

  return {
    width,
    height,
    blankLike,
    lowVariance,
    consoleErrors,
    pageErrors,
    requestFailures,
    viewportMatches,
    metadataPath: findDiagnosticsPath(imagePath),
    warnings,
  };
}

export function ensureImageFile(filePath: string): boolean {
  return /\.(png|jpe?g|webp)$/i.test(path.basename(filePath));
}
