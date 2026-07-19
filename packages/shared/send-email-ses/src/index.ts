import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import type { EmailBlastInput } from '@marketing-studio/types';

export function createSesClient(region: string, accessKeyId: string, secretAccessKey: string): SESv2Client {
  return new SESv2Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function sendEmail(client: SESv2Client, input: EmailBlastInput): Promise<string> {
  const cmd = new SendEmailCommand({
    FromEmailAddress: `${input.fromName} <${input.fromAddress}>`,
    Destination: { ToAddresses: input.recipients },
    Content: {
      Simple: {
        Subject: { Data: input.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: input.htmlBody, Charset: 'UTF-8' },
          Text: { Data: input.textBody, Charset: 'UTF-8' },
        },
      },
    },
  });
  const result = await client.send(cmd);
  return result.MessageId ?? 'unknown';
}

export async function sendEmailDryRun(input: EmailBlastInput): Promise<void> {
  console.log('[DRY RUN] Email preview:');
  console.log('  From   :', `${input.fromName} <${input.fromAddress}>`);
  console.log('  To     :', input.recipients.join(', '));
  console.log('  Subject:', input.subject);
  if (input.previewText) console.log('  Preview:', input.previewText);
  console.log('  HTML   :', input.htmlBody.slice(0, 300), input.htmlBody.length > 300 ? '...' : '');
}
