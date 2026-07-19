// SCAFFOLD — kvidai web push SDK 개발 완료 후 실제 구현으로 교체

import { sendPushNotification } from '@marketing-studio/send-push-kvidai';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface PushBrief {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  segment?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const slug = args.find(a => a.startsWith('--slug='))?.replace('--slug=', '');
  const campaignSlug = args.find(a => a.startsWith('--campaign='))?.replace('--campaign=', '');
  const langOverride = args.find(a => a.startsWith('--lang='))?.replace('--lang=', '') ?? 'ko';
  const dryRun = args.includes('--dry-run');

  let brief: PushBrief;
  const activeSlug = campaignSlug ?? slug ?? 'example';

  if (campaignSlug) {
    const campaignDir = resolve('../../campaigns', campaignSlug);
    if (!existsSync(resolve(campaignDir, 'brief.json'))) {
      console.error(`Campaign not found: ${campaignDir}/brief.json`);
      console.error(`Run: /new-campaign ${campaignSlug}`);
      process.exit(1);
    }
    const sharedBrief = JSON.parse(readFileSync(resolve(campaignDir, 'brief.json'), 'utf-8'));
    const pushFile = langOverride !== 'ko' ? `push.${langOverride}.json` : 'push.json';
    const pushOverrides = existsSync(resolve(campaignDir, pushFile))
      ? JSON.parse(readFileSync(resolve(campaignDir, pushFile), 'utf-8'))
      : existsSync(resolve(campaignDir, 'push.json'))
        ? JSON.parse(readFileSync(resolve(campaignDir, 'push.json'), 'utf-8'))
        : {};
    brief = { ...sharedBrief, ...pushOverrides } as PushBrief;
  } else {
    const briefPath = resolve(`in/${activeSlug}/brief.json`);
    if (!existsSync(briefPath)) {
      console.error(`Brief not found: ${briefPath}`);
      process.exit(1);
    }
    brief = JSON.parse(readFileSync(briefPath, 'utf-8')) as PushBrief;
  }

  if (dryRun) {
    console.log('[dry-run] Push payload:');
    console.log(JSON.stringify(brief, null, 2));
    console.log('\n→ --dry-run: 전송하지 않음');
    return;
  }

  await sendPushNotification(brief);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
