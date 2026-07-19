import { loadEnv, parseEnv } from '@marketing-studio/env';
import {
  getAccessToken,
  submitTextPost,
  submitLinkPost,
  submitImagePost,
} from '@marketing-studio/publish-reddit';
import { uploadBodyAssets } from '@marketing-studio/upload-assets';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

interface Brief {
  subreddit?: string;
  kind: 'self' | 'link' | 'image' | 'video';
  title: string;
  text?: string;
  url?: string;
  image?: string;
  bodyFile?: string;
  flairId?: string;
  nsfw?: boolean;
  spoiler?: boolean;
  sendreplies?: boolean;
}

async function main() {
  loadEnv();
  const env = parseEnv();

  const args = process.argv.slice(2);
  const postSlug = args.find(a => a.startsWith('--post='))?.replace('--post=', '');
  const campaignSlug = args.find(a => a.startsWith('--campaign='))?.replace('--campaign=', '');
  const subredditArg = args.find(a => a.startsWith('--subreddit='))?.replace('--subreddit=', '');
  const dryRun = args.includes('--dry-run');

  let brief: Brief;
  let briefDir: string;
  const activeSlug = campaignSlug ?? postSlug ?? '.example';

  if (campaignSlug) {
    const campaignDir = resolve('../../campaigns', campaignSlug);
    if (!existsSync(resolve(campaignDir, 'brief.json'))) {
      console.error(`Campaign not found: ${campaignDir}/brief.json`);
      console.error(`Run: /new-campaign ${campaignSlug}`);
      process.exit(1);
    }
    const sharedBrief = JSON.parse(readFileSync(resolve(campaignDir, 'brief.json'), 'utf-8'));
    const redditOverrides = existsSync(resolve(campaignDir, 'reddit.json'))
      ? JSON.parse(readFileSync(resolve(campaignDir, 'reddit.json'), 'utf-8'))
      : {};
    brief = { ...sharedBrief, ...redditOverrides };
    briefDir = campaignDir;
  } else {
    const slug = postSlug ?? '.example';
    briefDir = resolve('in', slug);
    if (!existsSync(resolve(briefDir, 'brief.json'))) {
      console.error(`Brief not found: ${resolve(briefDir, 'brief.json')}`);
      console.error(`Run: cp -r in/.example in/${slug} && vi in/${slug}/brief.json`);
      process.exit(1);
    }
    brief = JSON.parse(readFileSync(resolve(briefDir, 'brief.json'), 'utf-8'));
  }

  const subreddit = subredditArg ?? brief.subreddit ?? 'test';
  const { kind, title } = brief;

  if (kind === 'video') {
    throw new Error(
      'Video 게시는 템플릿 CLI에서 지원하지 않습니다.\n' +
        '@marketing-studio/publish-reddit 의 submitVideoPost() 를 직접 호출하세요.',
    );
  }

  // For self posts, prefer bodyFile (per-channel override) → body.md → brief.text
  let text = brief.text ?? '';
  if (kind === 'self') {
    const bodyFileName = brief.bodyFile ?? 'body.md';
    const bodyPath = resolve(briefDir, bodyFileName);
    if (existsSync(bodyPath)) {
      text = readFileSync(bodyPath, 'utf-8');
    }
    if (!text) {
      throw new Error(`Self post에는 ${bodyFileName} 또는 brief.text가 필요합니다.`);
    }
  }

  // Upload assets/ references in body to S3 (campaign mode only, if bucket configured)
  if (campaignSlug && kind === 'self' && env.AWS_S3_BUCKET) {
    console.log('assets/ 업로드 중...');
    text = await uploadBodyAssets(text, resolve(briefDir, 'assets'), campaignSlug, {
      region: env.AWS_SES_REGION,
      accessKeyId: env.AWS_SES_KEY,
      secretAccessKey: env.AWS_SES_SECRET,
      bucket: env.AWS_S3_BUCKET,
      cdnBase: env.AWS_S3_CDN_BASE,
    });
  }

  const commonOpts = {
    subreddit,
    flairId: brief.flairId,
    nsfw: brief.nsfw ?? false,
    spoiler: brief.spoiler ?? false,
    sendreplies: brief.sendreplies ?? true,
  };

  if (dryRun) {
    console.log('[DRY RUN] Reddit 게시 페이로드:');
    console.log('  subreddit:', subreddit);
    console.log('  kind     :', kind);
    console.log('  title    :', title);
    if (kind === 'self') console.log('  text     :', text.slice(0, 200), text.length > 200 ? '...' : '');
    if (kind === 'link') console.log('  url      :', brief.url);
    if (kind === 'image') console.log('  image    :', brief.image);
    console.log('  nsfw     :', commonOpts.nsfw);
    console.log('  spoiler  :', commonOpts.spoiler);
    return;
  }

  if (
    !env.REDDIT_CLIENT_ID ||
    !env.REDDIT_CLIENT_SECRET ||
    !env.REDDIT_USERNAME ||
    !env.REDDIT_PASSWORD ||
    !env.REDDIT_USER_AGENT
  ) {
    throw new Error(
      'Reddit 미설정: .env.production에 REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, ' +
        'REDDIT_USERNAME, REDDIT_PASSWORD, REDDIT_USER_AGENT를 추가하세요.',
    );
  }

  const authConfig = {
    clientId: env.REDDIT_CLIENT_ID,
    clientSecret: env.REDDIT_CLIENT_SECRET,
    username: env.REDDIT_USERNAME,
    password: env.REDDIT_PASSWORD,
    userAgent: env.REDDIT_USER_AGENT,
  };

  const token = await getAccessToken(authConfig);
  const ua = authConfig.userAgent;

  let result;

  if (kind === 'self') {
    result = await submitTextPost(token, ua, { kind: 'self', title, text, ...commonOpts });
  } else if (kind === 'link') {
    if (!brief.url) throw new Error('brief.json 또는 reddit.json에 url이 필요합니다 (kind=link).');
    result = await submitLinkPost(token, ua, { kind: 'link', title, url: brief.url, ...commonOpts });
  } else if (kind === 'image') {
    if (!brief.image) throw new Error('brief.json 또는 reddit.json에 image 파일명이 필요합니다 (kind=image).');
    const imagePath = resolve(briefDir, brief.image);
    if (!existsSync(imagePath)) {
      throw new Error(`이미지 파일을 찾을 수 없습니다: ${imagePath}`);
    }
    result = await submitImagePost(token, ua, { kind: 'image', title, imagePath, ...commonOpts });
  } else {
    throw new Error(`지원하지 않는 kind: ${kind as string}`);
  }

  const outputDir = campaignSlug
    ? resolve('../../campaigns', campaignSlug, 'out', 'reddit')
    : resolve(`outputs/${activeSlug}`);
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    resolve(outputDir, 'reddit-result.json'),
    JSON.stringify({ ...result, kind, subreddit, timestamp: new Date().toISOString() }, null, 2),
  );

  console.log(`✓ Reddit 발행 완료: ${result.url}`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
