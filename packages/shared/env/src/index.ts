import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { z } from 'zod';

function findMonorepoRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== dirname(dir)) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = dirname(dir);
  }
  throw new Error('Cannot find monorepo root (pnpm-workspace.yaml not found)');
}

export function loadEnv(): void {
  const root = findMonorepoRoot(process.cwd());
  config({ path: resolve(root, '.env.production') });
}

const schema = z.object({
  // AWS SES
  AWS_SES_REGION: z.string().default('us-east-1'),
  AWS_SES_KEY: z.string().min(1),
  AWS_SES_SECRET: z.string().min(1),
  KVIDAI_AWS_SEND_EMAIL_MARKETING: z.string().email(),
  KVIDAI_AWS_SEND_EMAIL_TRANSACTIONAL: z.string().email(),
  KVIDAI_ADMIN_EMAIL: z.string().email(),
  KVIDAI_SELF_URL: z.string().url(),
  // Blog — NodeBB (optional: 배포 후 추가)
  NODEBB_BASE_URL: z.string().url().optional(),
  NODEBB_TOKEN: z.string().optional(),
  // Blog — Discourse (optional: 배포 후 추가)
  DISCOURSE_BASE_URL: z.string().url().optional(),
  DISCOURSE_API_KEY: z.string().optional(),
  DISCOURSE_API_USERNAME: z.string().optional(),
  // Meta Graph API (optional: App 승인 후 추가)
  META_PAGE_ACCESS_TOKEN: z.string().optional(),
  META_PAGE_ID: z.string().optional(),
  META_IG_ACCOUNT_ID: z.string().optional(),
  // Reddit (optional: Reddit script app 발급 후 추가)
  REDDIT_CLIENT_ID: z.string().optional(),
  REDDIT_CLIENT_SECRET: z.string().optional(),
  REDDIT_USERNAME: z.string().optional(),
  REDDIT_PASSWORD: z.string().optional(),
  REDDIT_USER_AGENT: z.string().optional(),
  // S3 asset upload (optional: body.md 이미지/영상 자동 업로드)
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_CDN_BASE: z.string().url().optional(),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(): Env {
  return schema.parse(process.env);
}
