import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";
import type { ReviewAssets } from "./types";

function sanitizeName(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function getWorkDir(imagePath: string): string {
  const base = sanitizeName(path.relative(process.cwd(), imagePath));
  return path.join(process.env.VISION_CHECKER_TMP_DIR ?? path.join(os.tmpdir(), "affyink-ui-vision-check"), base);
}

function buildTileRegions(width: number, height: number, tileCount: number) {
  if (tileCount <= 0) {
    return [];
  }

  const regions: Array<{ name: string; left: number; top: number; width: number; height: number }> = [];
  const halfW = Math.max(1, Math.floor(width / 2));
  const halfH = Math.max(1, Math.floor(height / 2));

  regions.push({ name: "tile_top_left", left: 0, top: 0, width: halfW, height: halfH });
  regions.push({ name: "tile_top_right", left: width - halfW, top: 0, width: halfW, height: halfH });
  regions.push({ name: "tile_bottom_left", left: 0, top: height - halfH, width: halfW, height: halfH });
  regions.push({ name: "tile_bottom_right", left: width - halfW, top: height - halfH, width: halfW, height: halfH });

  const centerW = Math.max(1, Math.floor(width * 0.5));
  const centerH = Math.max(1, Math.floor(height * 0.5));
  regions.push({
    name: "tile_center",
    left: Math.max(0, Math.floor((width - centerW) / 2)),
    top: Math.max(0, Math.floor((height - centerH) / 2)),
    width: centerW,
    height: centerH,
  });

  return regions.slice(0, tileCount);
}

export async function prepareReviewAssets(
  imagePath: string,
  overviewWidth: number,
  tileCount: number,
  overviewQuality?: number,
): Promise<ReviewAssets> {
  const image = sharp(imagePath, { failOn: "none" });
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height) throw new Error(`Could not read image metadata for ${imagePath}`);

  const workDir = getWorkDir(imagePath);
  const tilesDir = path.join(workDir, "tiles");
  const overviewPath = path.join(workDir, "overview.jpg");
  const tilePaths: string[] = [];
  fs.mkdirSync(workDir, { recursive: true });

  const overviewPipeline = sharp(imagePath, { failOn: "none" })
    .resize({ width: Math.min(width, overviewWidth), withoutEnlargement: true });
  if (overviewQuality !== undefined) {
    await overviewPipeline.jpeg({ quality: overviewQuality }).toFile(overviewPath);
  } else {
    await overviewPipeline.jpeg().toFile(overviewPath);
  }

  const tileRegions = buildTileRegions(width, height, tileCount);
  if (tileRegions.length > 0) {
    const tilesDir = path.join(workDir, "tiles");
    fs.mkdirSync(tilesDir, { recursive: true });
  }

  for (const region of tileRegions) {
    const tilePath = path.join(tilesDir, `${region.name}.png`);
    await sharp(imagePath, { failOn: "none" })
      .extract(region)
      .png()
      .toFile(tilePath);
    tilePaths.push(tilePath);
  }

  return {
    workDir,
    screenshotPath: imagePath,
    overviewPath,
    tilePaths,
    width,
    height,
  };
}
