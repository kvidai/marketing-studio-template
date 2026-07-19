# Brief → Email Template

## Usage

Pass this template to Claude to generate all email assets for one campaign.
Save results to `packages/email-blast-template/in/{campaign}/`.

---

## Input Fields

- **Brand**: (kvid.ai / affy.ink)
- **Purpose**: (feature announcement / promotion / newsletter / onboarding)
- **Target audience**: (e.g., startup founders interested in AI marketing)
- **Core message**: (one sentence)
- **CTA**: (URL + button text)
- **Send date**: (YYYY-MM-DD)

---

## Generation Request

Given the inputs above, generate the following:

### 1. Subject line — 5 variants (for A/B testing)
→ Used in `in/{campaign}/brief.json` → `subject`

Rules:
- ≤30 chars (Korean)
- No spam triggers
- Each variant uses a different strategy: number, question, direct benefit, curiosity, urgency

### 2. HTML email body
→ Save to `in/{campaign}/body.html`
- Base: `packages/email-blast-template/in/.example/body.html`
- Header: brand colors
- Body: AIDA structure (Attention → Interest → Desire → Action)
- CTA button
- Footer: unsubscribe placeholder

### 3. Plain text body
→ Save to `in/{campaign}/body.txt`

### 4. brief.json
→ Save to `in/{campaign}/brief.json`
```json
{
  "subject": "chosen subject",
  "previewText": "preview text ≤90 chars",
  "fromName": "brand name",
  "recipients": []
}
```
