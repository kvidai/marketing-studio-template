#!/usr/bin/env bash
# ============================================================
# scripts/screenshot-ui.sh  — UI 스크린샷 자동 촬영 템플릿
#
# 사용법:
#   bash scripts/screenshot-ui.sh
#
# 사전 조건:
#   - agent-browser 설치됨
#   - 로컬 서버 실행 가능
#   - scripts/screenshot-lib.sh 존재
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SCREENSHOT_DIR="$PROJECT_DIR/docs/ui-screenshots"

source "$SCRIPT_DIR/screenshot-lib.sh"
# DATE, init_viewport, screenshot_all_sections, ensure_server,
# set_locale, otp_login, notify_old_files 사용 가능

# 폴더 구조: docs/ui-screenshots/{screen}/{screen}_{feature}_{DATE}.png
# 예) home/home_default_20260421.png / login/login_otp_20260421.png / dashboard/dashboard_filter-export_20260421.png
# screen을 폴더와 파일명 양쪽에 포함 → 파일만 모아서 볼 때도 screen 식별 가능
mkdir -p "$SCREENSHOT_DIR"

# ── 서버 기동 ────────────────────────────────────────────────
ensure_server 3000 "npm run dev"
trap 'stop_server_if_started 2>/dev/null || true' EXIT

# ── 뷰포트 초기화 (FHD 1920×1080) ───────────────────────────
agent-browser open "$BASE_URL/" && sleep 3
init_viewport

echo "=== UI Screenshot Run: $DATE ==="

# ── 1. Public Pages ──────────────────────────────────────────
echo "[1/3] public pages..."

mkdir -p "$SCREENSHOT_DIR/home" "$SCREENSHOT_DIR/login"

agent-browser open "$BASE_URL/" && sleep 5
init_console_listener
screenshot_all_sections "home/home_default_${DATE}"   "$BASE_URL/"      1
report_console_errors   "home/home_default_${DATE}.png"

agent-browser open "$BASE_URL/login" && sleep 3
init_console_listener
screenshot_all_sections "login/login_default_${DATE}" "$BASE_URL/login" 1
report_console_errors   "login/login_default_${DATE}.png"
# mkdir -p "$SCREENSHOT_DIR/signup"
# screenshot_all_sections "signup/signup_default_${DATE}" "$BASE_URL/register" 5
# 프로젝트에 맞게 추가

# ── 2. 로그인 ────────────────────────────────────────────────
echo "[2/3] login..."

# 방법 A — 이메일 + 패스워드
# agent-browser open "$BASE_URL/login" && sleep 2
# agent-browser fill @{email-input}    "{test-email}"
# agent-browser fill @{password-input} "{test-password}"
# agent-browser click @{submit-button} && sleep 4

# 방법 B — OTP (otp_login 사용, seed 데이터 필요)
# otp_login "admin@example.com" "111111"

# ── 3. Authenticated Pages ───────────────────────────────────
echo "[3/3] authenticated pages..."

# mkdir -p "$SCREENSHOT_DIR/dashboard"
# screenshot_all_sections "dashboard/dashboard_default_${DATE}" "$BASE_URL/dashboard" 5
# 프로젝트에 맞게 추가

# ── 완료 보고 ────────────────────────────────────────────────
echo ""
echo "=== 생성된 파일 ==="
find "$SCREENSHOT_DIR" -name "*_${DATE}.png" | sort | sed 's/^/  /'

# ── 이전 파일 존재 시 사람에게 알림 (AI 자동 삭제 금지) ──────
notify_old_files
