# Vision Checker Cache Key Guidance

> **Last Updated**: 2026-05-04
> **Version**: v0.2.0
> **Status**: Done

---

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-05-04 | v0.1.0 | Created plan for prompt cache spec, cache key helper, and unit tests in the vision-checker skill package | Codex |
| 2026-05-04 | v0.2.0 | Added prompt cache CLI wording, implemented deterministic cache key helpers, and added regression tests for prompt normalization and cache stability | Codex |

---

## Implementation & Test Status

| File | Feature | Impl | Unit Test | Integration Test |
|------|---------|------|-----------|------------------|
| `./contextual/.agents/skills/vision-checker/README.md` | CLI cache behavior spec wording for repeated `--prompt-file` and `--prompt-text` usage | ✅ | ⏭️ | ⏭️ |
| `./contextual/.agents/skills/vision-checker/SKILL.md` | skill guidance for cache-friendly prompt composition | ✅ | ⏭️ | ⏭️ |
| `./contextual/.agents/skills/vision-checker/lib/cache.ts` | deterministic prompt normalization and cache key builder | ✅ | ✅ | ⏭️ |
| `./contextual/.agents/skills/vision-checker/tests/vision-checker.test.ts` | regression coverage for prompt normalization and cache key stability | ✅ | ✅ | ⏭️ |

## Test Execution Results

```text
> vision-checker-skill@0.1.0 test /home/ubuntu/code_workspace/dev-standards/contextual/.agents/skills/vision-checker
> tsx --test tests/vision-checker.test.ts

1..19
# tests 19
# pass 19
# fail 0
# duration_ms 20123.461059
```

## Notes

- Cache guidance now explicitly states that `--prompt-file` and `--prompt-text` are concatenated in order and that cache identity should come from normalized final prompt content, not prompt file paths.
- `lib/cache.ts` provides reusable helpers for prompt normalization, deterministic payload building, SHA-256 hashing, and file-content-based asset hashing.
- Unit coverage now checks prompt normalization, deterministic option ordering, prompt-content stability across file paths, asset-content stability across file paths, prompt ordering invalidation, and runtime option invalidation.

## Remaining Tasks

- [x] Add CLI spec wording that defines cache behavior for repeated `--prompt-file` and `--prompt-text`
- [x] Implement deterministic cache key helper based on final prompt content and runtime options
- [x] Add unit tests for ordering, normalization, and option-sensitive cache invalidation
- [x] Run packaged unit tests
