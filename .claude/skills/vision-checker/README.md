# vision-checker

Cheap visual QA on screenshots using OpenRouter/Anthropic vision models.

Source: `.agents/skills/vision-checker/`

## 설치

`SKILL.md`는 gitignore 처리됨 — 아래 명령으로 생성 (repo root에서 실행):

```bash
pnpm --dir .agents/skills/vision-checker run prepare
```

이미 `SKILL.md`가 있어도 덮어씀 (`ln -sf` 멱등성 보장).

## 환경변수

`.agents/skills/vision-checker/.env.example` 참고. 필수: `.agents/skills/vision-checker/.env`

```bash
OPENROUTER_API_KEY=sk-or-...   # OpenRouter 사용 시
ANTHROPIC_API_KEY=sk-ant-...   # Anthropic native 사용 시
```

## 사용법

```bash
# repo root에서 실행
pnpm --dir .agents/skills/vision-checker check \
  /absolute/path/to/docs/ui-screenshots/some-page_20260503.png \
  --provider openai-compatible \
  --base-url https://openrouter.ai/api/v1 \
  --model google/gemini-3.1-flash-lite-preview \
  --prompt-text "레이아웃이 올바른지 확인해주세요"
```

모델 우선순위: SKILL.md의 "Model guidance" 섹션 참고.
