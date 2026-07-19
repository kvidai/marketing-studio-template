# Discourse — Integration Guide

## Overview

Uses Discourse REST API for forum/blog publishing.

## Current Status

**Instance not yet deployed.** After deployment, add to `.env.production`:

```
DISCOURSE_BASE_URL=https://community.kvid.ai
DISCOURSE_API_KEY=your-api-key
DISCOURSE_API_USERNAME=system
```

## API Key

Discourse admin panel → Admin → API → "New API Key" → Global or User key

## API Endpoint

```
POST {baseUrl}/posts.json
Api-Key: {apiKey}
Api-Username: {username}
Content-Type: application/json

{
  "title": "Post title",
  "raw": "Markdown body",
  "category": 1,
  "tags": []
}
```

## Usage

```typescript
import { publishToDiscourse } from '@marketing-studio/publish-discourse';
const result = await publishToDiscourse({ baseUrl, apiKey, apiUsername }, { title, content, category, tags, target: 'discourse' });
console.log(result.url);
```

Docs: https://docs.discourse.org/
