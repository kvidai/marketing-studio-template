import { loadEnv } from '@marketing-studio/env';
import { renderSlide, INSTAGRAM_SQUARE, INSTAGRAM_PORTRAIT } from '@marketing-studio/render-image';
import { renderHtml, closeBrowser } from '@marketing-studio/render-html';
import { getBrand } from '@marketing-studio/brand';
import { buildSlideSvg } from './svg-builder.js';
import { buildSlideHtml } from './html-builder.js';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { BrandId, SlideInput } from '@marketing-studio/types';

interface CardNewsBrief {
  title: string;
  brand: BrandId;
  format?: 'square' | 'portrait';
  slides: SlideInput[];
  caption: string;
  hashtags: string[];
}

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const setSlug = args.find(a => a.startsWith('--set='))?.replace('--set=', '');
  const campaignSlug = args.find(a => a.startsWith('--campaign='))?.replace('--campaign=', '');
  const langOverride = args.find(a => a.startsWith('--lang='))?.replace('--lang=', '') ?? 'ko';
  const brandOverride = args.find(a => a.startsWith('--brand='))?.replace('--brand=', '') as
    | BrandId
    | undefined;
  const renderer = (args.find(a => a.startsWith('--renderer='))?.replace('--renderer=', '') ?? 'satori') as
    | 'satori'
    | 'html';

  let brief: CardNewsBrief;
  const activeSlug = campaignSlug ?? setSlug ?? 'example';

  if (campaignSlug) {
    const campaignDir = resolve('../../campaigns', campaignSlug);
    if (!existsSync(resolve(campaignDir, 'brief.json'))) {
      console.error(`Campaign not found: ${campaignDir}/brief.json`);
      console.error(`Run: /new-campaign ${campaignSlug}`);
      process.exit(1);
    }
    const sharedBrief = JSON.parse(readFileSync(resolve(campaignDir, 'brief.json'), 'utf-8'));
    const cardnewsFile = langOverride !== 'ko' ? `cardnews.${langOverride}.json` : 'cardnews.json';
    const cardnewsOverrides = existsSync(resolve(campaignDir, cardnewsFile))
      ? JSON.parse(readFileSync(resolve(campaignDir, cardnewsFile), 'utf-8'))
      : existsSync(resolve(campaignDir, 'cardnews.json'))
        ? JSON.parse(readFileSync(resolve(campaignDir, 'cardnews.json'), 'utf-8'))
        : {};
    brief = { ...sharedBrief, ...cardnewsOverrides } as CardNewsBrief;
  } else {
    const slug = setSlug ?? 'example';
    const briefPath = resolve('in', slug, 'brief.json');
    if (!existsSync(briefPath)) {
      console.error(`Brief not found: ${briefPath}`);
      console.error(`Run: cp -r in/.example in/${slug} && vi in/${slug}/brief.json`);
      process.exit(1);
    }
    brief = JSON.parse(readFileSync(briefPath, 'utf-8')) as CardNewsBrief;
  }

  const brand = getBrand(brandOverride ?? brief.brand ?? 'kvidai');
  const [width, height] =
    (brief.format ?? 'square') === 'portrait' ? INSTAGRAM_PORTRAIT : INSTAGRAM_SQUARE;

  // satori → out/cardnews/{lang}/   html → out/cardnews-html/{lang}/
  const outSuffix = renderer === 'html' ? `cardnews-html/${langOverride}` : `cardnews/${langOverride}`;
  const outputDir = campaignSlug
    ? resolve('../../campaigns', campaignSlug, 'out', outSuffix)
    : resolve(`outputs/${activeSlug}`);
  mkdirSync(outputDir, { recursive: true });

  console.log(`renderer: ${renderer}`);

  for (let i = 0; i < brief.slides.length; i++) {
    const slide = brief.slides[i];
    const outputPath = resolve(outputDir, `slide-${String(i + 1).padStart(2, '0')}.jpg`);

    if (renderer === 'html') {
      const html = buildSlideHtml({ width, height, slide, brand });
      await renderHtml({ width, height, html }, outputPath);
    } else {
      const svgOverlay = await buildSlideSvg({ width, height, slide, brand });
      await renderSlide({ width, height, svgOverlay, brand }, outputPath);
    }

    console.log(`✓ [${i + 1}/${brief.slides.length}] ${outputPath}`);
  }

  if (renderer === 'html') await closeBrowser();

  console.log(`\n총 ${brief.slides.length}장 렌더 완료 → ${outputDir}`);
  console.log('다음 단계: vision-checker QA → upload (Meta 앱 설정 후)');
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
