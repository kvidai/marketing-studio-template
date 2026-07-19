# AWS SES — Integration Guide

## Overview

Uses AWS Simple Email Service v2 (SESv2). Current region: `us-east-1`.

## Current Setup

- **Account**: epicmobile181@gmail.com (AWS ID: 570872761770)
- **Region**: `us-east-1`
- **Sending domains**: `em.kvid.ai` (marketing), `mail.kvid.ai` (transactional)
- **Keys**: `AWS_SES_KEY`, `AWS_SES_SECRET` in `.env.production`

## Usage

```typescript
import { createSesClient, sendEmail, sendEmailDryRun } from '@marketing-studio/send-email-ses';

const client = createSesClient(env.AWS_SES_REGION, env.AWS_SES_KEY, env.AWS_SES_SECRET);
await sendEmail(client, { subject, htmlBody, textBody, recipients, fromAddress, fromName });
```

## SES Sandbox

New AWS accounts start in sandbox mode — can only send to verified email addresses.

To enable production sending: AWS Console → SES → Account Dashboard → "Request production access".

## Sending Limits

| Mode | Limit |
|------|-------|
| Sandbox | 200/day, 1/sec |
| Production (default) | 50,000/day, 14/sec |

## SDK

`@aws-sdk/client-sesv2`

Docs: https://docs.aws.amazon.com/ses/latest/dg/send-email-api.html
