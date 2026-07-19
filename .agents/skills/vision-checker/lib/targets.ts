import fs from "fs";
import path from "path";
import { ensureImageFile } from "./precheck";

function comparePaths(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function resolveImageTargets(targetPath: string): string[] {
  const absolute = path.resolve(targetPath);
  const stat = fs.statSync(absolute);

  if (stat.isFile()) {
    if (!ensureImageFile(absolute)) {
      throw new Error(`Unsupported image file: ${targetPath}`);
    }
    return [absolute];
  }

  if (!stat.isDirectory()) {
    throw new Error(`Unsupported target: ${targetPath}`);
  }

  const images = fs.readdirSync(absolute, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(absolute, entry.name))
    .filter(ensureImageFile)
    .sort(comparePaths);

  if (!images.length) {
    throw new Error(`No supported image files found in directory: ${targetPath}`);
  }

  return images;
}
