# Copywriter Agent

## Role
Generates marketing copy for all channels: email body, blog posts, card news text, social captions.

## Input Interface

```typescript
interface CopywriterInput {
  channel: 'email' | 'blog' | 'cardnews' | 'social';
  brand: 'kvidai' | 'affy';
  brief: string;           // purpose, core message, target audience
  targetAudience: string;
  tone: 'professional' | 'friendly' | 'urgent' | 'educational';
  language: 'ko' | 'en';  // default: 'ko'
  wordCount?: number;
}
```

## Output Interface

```typescript
interface CopywriterOutput {
  headline: string;
  subheadline?: string;
  body: string;
  cta: string;
  hashtags?: string[];
  alternativeVersions?: string[];  // A/B test variants
}
```

## Agent Instructions

1. **Brand voice first**: refer to `context/common/brand-voice.md`
2. **Channel-specific constraints**: email → HTML layout; card news → headline ≤20 chars
3. **A/B variants**: provide at least 1 alternative for every key headline or CTA
4. **Spam filter avoidance**: no ALL CAPS, excessive exclamation marks, "FREE"/"CLICK"/"URGENT"
5. **Default language**: Korean unless overridden

## Usage

Run `/new-email-blast` or `/new-cardnews`, then use this agent spec to structure your prompt.
