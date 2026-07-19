# Hermes Agent Docker Isolation Runner

> **Last Updated**: 2026-05-25
> **Version**: v1.0.0
> **Status**: done
> **Created In**: /home/ubuntu/code_workspace/marketing-studio

---

## Command Clarity Check

| Item | Status |
|------|--------|
| Scope | ✅ `scripts/hermes-docker.sh` 생성 |
| Done criteria | ✅ Docker로 Hermes 실행 + 인증 3가지 방법 지원 |
| Constraints | ✅ 기존 scripts/ 파일 건드리지 않음 |
| Error handling | ✅ gateway 중복 실행 방지, 선택적 마운트 처리 |

**Runnable**: ✅

---

## Changelog

| Date | Version | Changes | Directory | Author |
|------|---------|---------|-----------|--------|
| 2026-05-25 | v1.0.0 | scripts/hermes-docker.sh 최초 생성 | /home/ubuntu/code_workspace/marketing-studio | kincjf |

---

## Implementation & Test Status

| File | Feature | Impl | Unit Test | Integration Test |
|------|---------|------|-----------|------------------|
| `scripts/hermes-docker.sh` | interactive mode | ✅ | ⏭️ | ⏭️ |
| `scripts/hermes-docker.sh` | gateway mode | ✅ | ⏭️ | ⏭️ |
| `scripts/hermes-docker.sh` | dashboard mode | ✅ | ⏭️ | ⏭️ |
| `scripts/hermes-docker.sh` | shell mode (Method C) | ✅ | ⏭️ | ⏭️ |
| `scripts/hermes-docker.sh` | API key passthrough (Method A) | ✅ | ⏭️ | ⏭️ |
| `scripts/hermes-docker.sh` | credential mount (Method B) | ✅ | ⏭️ | ⏭️ |
| `scripts/hermes-docker.sh` | stop / logs / status | ✅ | ⏭️ | ⏭️ |

---

## Summary

Hermes Agent를 Docker로 격리 실행하기 위한 스크립트.

- **이미지**: `nousresearch/hermes-agent`
- **데이터 볼륨**: `~/.hermes:/opt/data` — Hermes 설정·세션·메모리
- **워크스페이스 볼륨**: `<project-root>:/workspace` — 현재 디렉토리 마운트
- **워킹 디렉토리**: `/workspace`

### 인증 방법

| Method | 방법 | 사용 시점 |
|--------|------|---------|
| A | `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` env var | CI·자동화·서버 |
| B | `MOUNT_CLAUDE=1` / `MOUNT_CODEX=1` — 호스트 credential 디렉토리 마운트 | 개발 로컬 |
| C | `shell` 모드 진입 후 컨테이너 내 수동 로그인 → `docker commit`으로 이미지화 | 완전 격리 필요 시 |

### 주요 모드

```bash
./scripts/hermes-docker.sh setup        # 최초 1회
./scripts/hermes-docker.sh              # 대화형 CLI (기본)
./scripts/hermes-docker.sh gateway      # 백그라운드 :8642
./scripts/hermes-docker.sh dashboard    # 백그라운드 + UI :9119
./scripts/hermes-docker.sh shell        # bash 직접 접근 (수동 로그인용)
./scripts/hermes-docker.sh stop
```

---

## Research Log

### Reference URLs
- https://hermes-agent.nousresearch.com/docs/user-guide/docker

### Key Findings
- Hermes 공식 문서에는 workspace 마운트 전용 플래그 없음 → Docker 표준 `-v` + `-w` 조합으로 해결
- credential 디렉토리 위치: Claude Code → `~/.claude`, Codex CLI → `~/.codex`
- 컨테이너 내부에서 브라우저 OAuth 불가 → shell 모드에서 URL 복사 후 호스트 브라우저로 열기

---

## Decision Log

### 인증 방법 설계 — 2026-05-25

| # | Option | Pros | Cons | Fit when |
|---|--------|------|------|----------|
| 1 | API key env var | headless, 재시작 안전 | 키 직접 노출 | CI/서버/자동화 |
| 2 | credential 디렉토리 마운트 [recommended] | 호스트 기존 로그인 재사용, 편함 | 격리 약화 | 로컬 개발 |
| 3 | shell 진입 후 수동 로그인 + commit | 완전 격리 유지 | 재시작마다 재인증 or commit 필요 | 완전 격리 필수 환경 |

**Decision**: 3가지 모두 지원 — **Why**: 용도(로컬 개발 vs CI vs 격리 서버)에 따라 선택할 수 있어야 함
