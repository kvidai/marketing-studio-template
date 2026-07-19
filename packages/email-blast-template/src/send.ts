import { loadEnv, parseEnv } from '@marketing-studio/env';
import { createSesClient, sendEmail, sendEmailDryRun } from '@marketing-studio/send-email-ses';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

async function main() {
  loadEnv();
  const env = parseEnv();

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const campaignSlug = args.find(a => a.startsWith('--campaign='))?.replace('--campaign=', '') ?? 'example';
  const toOverride = args.find(a => a.startsWith('--to='))?.replace('--to=', '');

  // Campaign mode: check repo-level campaigns/ first, fall back to local in/
  const campaignDir = resolve('../../campaigns', campaignSlug);
  const localDir = resolve('in', campaignSlug);
  const isCampaignMode = existsSync(resolve(campaignDir, 'brief.json'));
  const briefDir = isCampaignMode ? campaignDir : localDir;

  if (!existsSync(resolve(briefDir, 'brief.json'))) {
    console.error(`Brief not found: ${campaignDir}/brief.json or ${localDir}/brief.json`);
    console.error(`Run: /new-campaign ${campaignSlug}`);
    process.exit(1);
  }

  const sharedBrief = JSON.parse(readFileSync(resolve(briefDir, 'brief.json'), 'utf-8'));
  const emailOverrides =
    isCampaignMode && existsSync(resolve(campaignDir, 'email.json'))
      ? JSON.parse(readFileSync(resolve(campaignDir, 'email.json'), 'utf-8'))
      : {};

  const brief = { ...sharedBrief, ...emailOverrides } as {
    subject: string;
    previewText?: string;
    fromName?: string;
    summary?: string;
    recipients?: string[];
  };

  const htmlPath = resolve(briefDir, 'body.html');
  const textPath = resolve(briefDir, 'body.txt');

  const htmlBody = existsSync(htmlPath)
    ? readFileSync(htmlPath, 'utf-8')
    : `<p>${brief.summary ?? '(body.html 없음)'}</p>`;
  const textBody = existsSync(textPath) ? readFileSync(textPath, 'utf-8') : (brief.summary ?? '');

  const recipients = toOverride
    ? [toOverride]
    : (brief.recipients?.length ? brief.recipients : [env.KVIDAI_ADMIN_EMAIL]);

  const input = {
    subject: brief.subject,
    previewText: brief.previewText,
    htmlBody,
    textBody,
    recipients,
    fromAddress: env.KVIDAI_AWS_SEND_EMAIL_MARKETING,
    fromName: brief.fromName ?? 'kvid.ai',
  };

  if (dryRun) {
    await sendEmailDryRun(input);
    return;
  }

  const client = createSesClient(env.AWS_SES_REGION, env.AWS_SES_KEY, env.AWS_SES_SECRET);
  const messageId = await sendEmail(client, input);

  const outputDir = isCampaignMode
    ? resolve(campaignDir, 'out', 'email')
    : resolve(`outputs/${campaignSlug}`);
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    resolve(outputDir, 'send-log.json'),
    JSON.stringify({ messageId, timestamp: new Date().toISOString(), subject: input.subject, recipients }, null, 2),
  );

  console.log(`✓ Sent. MessageId: ${messageId}`);
  console.log(`  Log: ${outputDir}/send-log.json`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
