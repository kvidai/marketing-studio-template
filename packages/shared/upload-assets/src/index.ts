import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, existsSync } from 'fs';
import { resolve, extname } from 'path';

export interface AssetUploadConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** CloudFront or custom CDN base URL. Falls back to S3 public URL if omitted. */
  cdnBase?: string;
}

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

function mimeType(filename: string): string {
  return MIME[extname(filename).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Scans bodyText for `assets/filename` references, uploads each file found in
 * assetsDir to S3 under `campaigns/{campaignSlug}/assets/`, and returns the
 * body with local paths replaced by public URLs.
 *
 * Files referenced in the body but missing from assetsDir are warned and skipped.
 * If no assets/ references are found the original bodyText is returned unchanged.
 */
export async function uploadBodyAssets(
  bodyText: string,
  assetsDir: string,
  campaignSlug: string,
  config: AssetUploadConfig,
): Promise<string> {
  // Match assets/anything not followed by whitespace, quote, paren, or >
  const refs = new Set<string>();
  const pattern = /assets\/([^\s"')<>]+)/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(bodyText)) !== null) {
    refs.add(m[1]);
  }

  if (refs.size === 0) return bodyText;

  const client = new S3Client({
    region: config.region,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });

  const base = config.cdnBase
    ? config.cdnBase.replace(/\/$/, '')
    : `https://${config.bucket}.s3.${config.region}.amazonaws.com`;

  const urlMap = new Map<string, string>();

  for (const filename of refs) {
    const localPath = resolve(assetsDir, filename);
    if (!existsSync(localPath)) {
      console.warn(`  ⚠  asset 없음 (건너뜀): ${localPath}`);
      continue;
    }
    const key = `campaigns/${campaignSlug}/assets/${filename}`;
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: readFileSync(localPath),
        ContentType: mimeType(filename),
      }),
    );
    const url = `${base}/${key}`;
    urlMap.set(`assets/${filename}`, url);
    console.log(`  ↑ S3: ${filename} → ${url}`);
  }

  let result = bodyText;
  for (const [local, url] of urlMap) {
    result = result.replaceAll(local, url);
  }
  return result;
}
