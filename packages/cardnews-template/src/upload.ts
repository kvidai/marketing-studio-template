import { loadEnv, parseEnv } from '@marketing-studio/env';
import { uploadToInstagram, uploadToFacebook } from '@marketing-studio/upload-meta';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

async function main() {
  loadEnv();
  const env = parseEnv();

  const args = process.argv.slice(2);
  const setSlug = args.find(a => a.startsWith('--set='))?.replace('--set=', '');
  const campaignSlug = args.find(a => a.startsWith('--campaign='))?.replace('--campaign=', '');
  const platform = (
    args.find(a => a.startsWith('--platform='))?.replace('--platform=', '') ?? 'instagram'
  ) as 'instagram' | 'facebook';

  if (!env.META_PAGE_ACCESS_TOKEN || !env.META_PAGE_ID) {
    throw new Error(
      'Meta 미설정: .env.production에 META_PAGE_ACCESS_TOKEN, META_PAGE_ID를 추가하세요.\n' +
        'Instagram 사용 시 META_IG_ACCOUNT_ID도 필요합니다.',
    );
  }

  const activeSlug = campaignSlug ?? setSlug ?? 'example';
  let brief: { caption: string; hashtags: string[] };

  if (campaignSlug) {
    const campaignDir = resolve('../../campaigns', campaignSlug);
    const sharedBrief = existsSync(resolve(campaignDir, 'brief.json'))
      ? JSON.parse(readFileSync(resolve(campaignDir, 'brief.json'), 'utf-8'))
      : {};
    const cardnewsOverrides = existsSync(resolve(campaignDir, 'cardnews.json'))
      ? JSON.parse(readFileSync(resolve(campaignDir, 'cardnews.json'), 'utf-8'))
      : {};
    brief = { ...sharedBrief, ...cardnewsOverrides };
  } else {
    const slug = setSlug ?? 'example';
    const briefPath = resolve('in', slug, 'brief.json');
    if (!existsSync(briefPath)) {
      console.error(`Brief not found: ${briefPath}`);
      process.exit(1);
    }
    brief = JSON.parse(readFileSync(briefPath, 'utf-8'));
  }

  const outputDir = resolve(`outputs/${activeSlug}`);
  const imagePaths: string[] = [];
  let i = 1;
  while (existsSync(resolve(outputDir, `slide-${String(i).padStart(2, '0')}.jpg`))) {
    imagePaths.push(resolve(outputDir, `slide-${String(i).padStart(2, '0')}.jpg`));
    i++;
  }

  if (imagePaths.length === 0) {
    console.error(`렌더링된 슬라이드 없음. 먼저 pnpm render --campaign=${activeSlug} 실행`);
    process.exit(1);
  }

  const caption = `${brief.caption}\n\n${brief.hashtags.join(' ')}`;
  const config = {
    pageAccessToken: env.META_PAGE_ACCESS_TOKEN,
    pageId: env.META_PAGE_ID,
    igAccountId: env.META_IG_ACCOUNT_ID,
  };

  const result =
    platform === 'instagram'
      ? await uploadToInstagram(config, imagePaths, caption)
      : await uploadToFacebook(config, imagePaths, caption);

  console.log(`✓ ${platform} 업로드 완료: ${result.permalink}`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
