import { loadEnv, parseEnv } from '@marketing-studio/env';
import { publishToNodeBB } from '@marketing-studio/publish-nodebb';
import { publishToDiscourse } from '@marketing-studio/publish-discourse';
import { uploadBodyAssets } from '@marketing-studio/upload-assets';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

async function main() {
  loadEnv();
  const env = parseEnv();

  const args = process.argv.slice(2);
  const postSlug = args.find(a => a.startsWith('--post='))?.replace('--post=', '');
  const campaignSlug = args.find(a => a.startsWith('--campaign='))?.replace('--campaign=', '');
  const targetArg = args.find(a => a.startsWith('--target='))?.replace('--target=', '') as
    | 'nodebb'
    | 'discourse'
    | undefined;

  let briefDir: string;
  let brief: { title: string; target?: 'nodebb' | 'discourse'; category?: string; tags?: string[]; bodyFile?: string };
  const activeSlug = campaignSlug ?? postSlug ?? 'example';

  if (campaignSlug) {
    const campaignDir = resolve('../../campaigns', campaignSlug);
    if (!existsSync(resolve(campaignDir, 'brief.json'))) {
      console.error(`Campaign not found: ${campaignDir}/brief.json`);
      console.error(`Run: /new-campaign ${campaignSlug}`);
      process.exit(1);
    }
    const sharedBrief = JSON.parse(readFileSync(resolve(campaignDir, 'brief.json'), 'utf-8'));
    const blogOverrides = existsSync(resolve(campaignDir, 'blog.json'))
      ? JSON.parse(readFileSync(resolve(campaignDir, 'blog.json'), 'utf-8'))
      : {};
    brief = { ...sharedBrief, ...blogOverrides };
    briefDir = campaignDir;
  } else {
    const slug = postSlug ?? 'example';
    briefDir = resolve('in', slug);
    if (!existsSync(resolve(briefDir, 'brief.json'))) {
      console.error(`Brief not found: ${resolve(briefDir, 'brief.json')}`);
      console.error(`Run: cp -r in/.example in/${slug} && vi in/${slug}/brief.json`);
      process.exit(1);
    }
    brief = JSON.parse(readFileSync(resolve(briefDir, 'brief.json'), 'utf-8'));
  }

  // bodyFile (per-channel override) → content.md (standalone) → body.md (campaign)
  const bodyFileName = brief.bodyFile ?? null;
  const contentPath = resolve(briefDir, 'content.md');
  const bodyPath = resolve(briefDir, bodyFileName ?? 'body.md');
  const resolvedContentPath = bodyFileName
    ? (existsSync(bodyPath) ? bodyPath : null)
    : existsSync(contentPath)
      ? contentPath
      : existsSync(bodyPath)
        ? bodyPath
        : null;
  if (!resolvedContentPath) {
    console.error(`Content not found: ${contentPath} or ${bodyPath}`);
    process.exit(1);
  }
  let content = readFileSync(resolvedContentPath, 'utf-8');

  // Upload assets/ references in body to S3 (campaign mode only, if bucket configured)
  if (campaignSlug && env.AWS_S3_BUCKET) {
    console.log('assets/ 업로드 중...');
    content = await uploadBodyAssets(content, resolve(briefDir, 'assets'), campaignSlug, {
      region: env.AWS_SES_REGION,
      accessKeyId: env.AWS_SES_KEY,
      secretAccessKey: env.AWS_SES_SECRET,
      bucket: env.AWS_S3_BUCKET,
      cdnBase: env.AWS_S3_CDN_BASE,
    });
  }

  const target = targetArg ?? brief.target ?? 'nodebb';
  const outputDir = campaignSlug
    ? resolve('../../campaigns', campaignSlug, 'out', 'blog')
    : resolve(`outputs/${activeSlug}`);
  mkdirSync(outputDir, { recursive: true });

  if (target === 'nodebb') {
    if (!env.NODEBB_BASE_URL || !env.NODEBB_TOKEN) {
      throw new Error(
        'NodeBB 미설정: .env.production에 NODEBB_BASE_URL과 NODEBB_TOKEN을 추가하세요.',
      );
    }
    const result = await publishToNodeBB(
      { baseUrl: env.NODEBB_BASE_URL, token: env.NODEBB_TOKEN },
      { title: brief.title, content, category: brief.category, tags: brief.tags, target: 'nodebb' },
    );
    writeFileSync(resolve(outputDir, 'nodebb-result.json'), JSON.stringify(result, null, 2));
    console.log(`✓ NodeBB 발행 완료: ${result.url}`);
  }

  if (target === 'discourse') {
    if (!env.DISCOURSE_BASE_URL || !env.DISCOURSE_API_KEY || !env.DISCOURSE_API_USERNAME) {
      throw new Error(
        'Discourse 미설정: .env.production에 DISCOURSE_BASE_URL, DISCOURSE_API_KEY, DISCOURSE_API_USERNAME을 추가하세요.',
      );
    }
    const result = await publishToDiscourse(
      {
        baseUrl: env.DISCOURSE_BASE_URL,
        apiKey: env.DISCOURSE_API_KEY,
        apiUsername: env.DISCOURSE_API_USERNAME,
      },
      { title: brief.title, content, category: brief.category, tags: brief.tags, target: 'discourse' },
    );
    writeFileSync(resolve(outputDir, 'discourse-result.json'), JSON.stringify(result, null, 2));
    console.log(`✓ Discourse 발행 완료: ${result.url}`);
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
