#!/usr/bin/env bash
# ============================================================
# scripts/screenshot-lib.sh
# agent-browser 공통 헬퍼 함수 모음
#
# 사용법:
#   source "$(dirname "$0")/screenshot-lib.sh"
#
# 의존 변수 (소싱 전에 설정):
#   SCREENSHOT_DIR  — 스크린샷 저장 디렉토리 (필수)
#   BASE_URL        — 서버 베이스 URL (기본: http://localhost:3001)
#
# 파일명 규칙:
#   {screen}_{DATE}.png  (예: home_20260421.png)
#   DATE 는 이 파일 소싱 시점에 자동 설정됨
# ============================================================

BASE_URL="${BASE_URL:-http://localhost:3001}"
DATE=$(date +%Y%m%d)

# 뷰포트를 FHD(1920×1080)로 설정 — 소싱 직후 자동 실행
# 스크린샷 실행 전에 브라우저가 열려 있어야 적용됨
init_viewport() {
  agent-browser set-viewport 1920 1080
}

# ── notify_old_files ─────────────────────────────────────────
# 현재 DATE 이전 파일이 SCREENSHOT_DIR 에 남아 있으면
# 사람에게 확인 후 삭제하도록 안내한다.
# AI는 절대 자동 삭제하지 않는다 (UI는 사람이 눈으로 확인 필요).
#
# Usage:
#   notify_old_files          # 전체 디렉토리 검사
#   notify_old_files "p1-"    # prefix 필터 지정
# ────────────────────────────────────────────────────────────
notify_old_files() {
  local PREFIX="${1:-}"
  local OLD_FILES
  OLD_FILES=$(find "$SCREENSHOT_DIR" -name "${PREFIX}*.png" 2>/dev/null | grep -v "_${DATE}.png" | sort || true)
  if [ -n "$OLD_FILES" ]; then
    echo ""
    echo "⚠️  [정리 필요] 이전 날짜의 스크린샷이 남아 있습니다."
    echo "    새 파일(${DATE})과 과거 파일이 동시에 존재합니다."
    echo "    아래 파일을 사람이 직접 확인 후 불필요한 것을 삭제하고 commit/push 하세요:"
    echo "$OLD_FILES" | sed 's/^/      /'
    echo ""
    echo "    git add docs/ui-screenshots/"
    echo "    git commit -m \"docs: update UI screenshots (${DATE})\""
    echo "    git push"
  fi
}

# ── screenshot_all_sections ──────────────────────────────────
# 페이지 전체를 뷰포트 단위로 자동 분할 촬영.
# 촬영 횟수 = ceil(scrollHeight / innerHeight)
#
# 파일명:
#   첫 번째 샷: {SCREENSHOT_DIR}/{BASE_NAME}.png
#   추가 샷:   {SCREENSHOT_DIR}/{BASE_NAME}-1.png, -2.png, ...
#   짧은 페이지(scrollH ≤ viewportH): 1장만 생성
#
# Usage:
#   screenshot_all_sections NAME URL [SLEEP_SECS]
#
# Example:
#   screenshot_all_sections "home-en" "$BASE_URL/" 5
# ────────────────────────────────────────────────────────────
screenshot_all_sections() {
  local BASE_NAME="$1"
  local URL="$2"
  local SLEEP="${3:-5}"

  agent-browser open "$URL" && sleep "$SLEEP"

  local SCROLL_H VIEWPORT_H
  SCROLL_H=$(agent-browser eval "document.body.scrollHeight" 2>/dev/null | tail -1 | tr -d '"' | tr -d ' ')
  VIEWPORT_H=$(agent-browser eval "window.innerHeight" 2>/dev/null | tail -1 | tr -d '"' | tr -d ' ')

  [[ "$SCROLL_H"   =~ ^[0-9]+$ ]] || SCROLL_H=900
  [[ "$VIEWPORT_H" =~ ^[0-9]+$ ]] || VIEWPORT_H=900

  local NUM=$(( (SCROLL_H + VIEWPORT_H - 1) / VIEWPORT_H ))
  echo "  [${BASE_NAME}] scrollH=${SCROLL_H}px / viewportH=${VIEWPORT_H}px → ${NUM} shot(s)"

  agent-browser eval "window.scrollTo(0, 0)" && sleep 1
  agent-browser screenshot "$SCREENSHOT_DIR/${BASE_NAME}.png"
  echo "✓ ${BASE_NAME}.png"

  for i in $(seq 1 $((NUM - 1))); do
    local Y=$(( i * VIEWPORT_H ))
    agent-browser eval "window.scrollTo(0, $Y)" && sleep 1
    agent-browser screenshot "$SCREENSHOT_DIR/${BASE_NAME}-${i}.png"
    echo "✓ ${BASE_NAME}-${i}.png (y=${Y})"
  done
}

# ── set_locale ───────────────────────────────────────────────
# affy-locale 쿠키를 설정한다.
# 페이지 열기 전에 호출해야 렌더링 시 적용된다.
#
# Usage:
#   set_locale en
#   set_locale ko
# ────────────────────────────────────────────────────────────
set_locale() {
  local LOCALE="$1"
  agent-browser eval "document.cookie='affy-locale=${LOCALE}; path=/; max-age=31536000'"
}

# ── otp_login ────────────────────────────────────────────────
# OTP verify-otp API를 브라우저 eval로 직접 호출.
# → httpOnly 세션 쿠키 자동 세팅 (send-otp/Resend 우회).
# seed-test-users.ts 로 OTP 시드가 먼저 완료되어 있어야 한다.
#
# Usage:
#   otp_login EMAIL OTP_CODE
#
# Example:
#   otp_login "admin@affy.ink"   "111111"   # ADMIN
#   otp_login "partner@affy.ink" "222222"   # AFFILIATE
# ────────────────────────────────────────────────────────────
otp_login() {
  local EMAIL="$1"
  local CODE="$2"

  agent-browser open "$BASE_URL/login" && sleep 2
  agent-browser eval "(async()=>{
    const r = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      credentials: 'include',
      body: JSON.stringify({email:'${EMAIL}', code:'${CODE}'})
    });
    const d = await r.json();
    return JSON.stringify({status: r.status, role: d.user?.role});
  })()"
}

# ── browser_json ─────────────────────────────────────────────
# 인증된 fetch로 JSON을 가져와 특정 필드를 반환한다.
# agent-browser eval의 반환값을 bash 변수로 캡처할 때 사용.
#
# Usage:
#   VAR=$(browser_json "JS_EXPR" "/api/path")
#
# Example:
#   ADV_ID=$(browser_json "d.advertisers?.[0]?.id||''" "/api/admin/advertisers")
#   SHOP_ID=$(browser_json "d.shops?.[0]?.id||''"     "/api/admin/advertisers/$ADV_ID/shops")
# ────────────────────────────────────────────────────────────
browser_json() {
  local EXPR="$1"
  local API_PATH="$2"

  agent-browser eval "(async()=>{
    const r = await fetch('${API_PATH}', {credentials:'include'});
    const d = await r.json();
    return ${EXPR};
  })()" 2>/dev/null | tail -1 | tr -d '"'
}

# ── ensure_server ────────────────────────────────────────────
# 개발 서버가 실행 중인지 확인하고, 없으면 pnpm dev로 시작한다.
# 이미 실행 중이면 아무것도 하지 않는다.
#
# Usage:
#   ensure_server PORT "pnpm --filter @affyink/dashboard dev"
#
# Example:
#   ensure_server 3001 "pnpm --filter @affyink/dashboard dev"
# ────────────────────────────────────────────────────────────
ensure_server() {
  local PORT="$1"
  local START_CMD="$2"
  local LOG="${3:-/tmp/server-screenshot-${PORT}.log}"

  if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/" | grep -qE "^[23]"; then
    echo "서버 이미 실행 중 (port ${PORT})"
    return 0
  fi

  eval "$START_CMD" > "$LOG" 2>&1 &
  echo "서버 시작 중 (port ${PORT})..."

  for i in $(seq 1 20); do
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/" 2>/dev/null)
    if echo "$code" | grep -qE "^[23]"; then
      echo "서버 준비 완료 (${i}×2s)"
      return 0
    fi
    sleep 2
  done

  echo "⚠ 서버 응답 없음 (port ${PORT}) — $LOG 확인"
  return 1
}

# ── init_console_listener ────────────────────────────────────
# 페이지에 console.error / window.error / unhandledrejection
# 리스너를 주입한다. 페이지 open 직후 호출할 것.
#
# Usage:
#   agent-browser open "$URL" && sleep 3
#   init_console_listener
# ────────────────────────────────────────────────────────────
init_console_listener() {
  agent-browser eval "
    window.__consoleErrors = [];
    const origErr = console.error.bind(console);
    console.error = (...a) => {
      window.__consoleErrors.push('[console.error] ' + a.join(' '));
      origErr(...a);
    };
    window.addEventListener('error', (e) => {
      window.__consoleErrors.push('[error] ' + e.message + ' (' + e.filename + ':' + e.lineno + ')');
    });
    window.addEventListener('unhandledrejection', (e) => {
      window.__consoleErrors.push('[unhandledrejection] ' + String(e.reason));
    });
    'listeners installed';
  " > /dev/null
}

# ── report_console_errors ────────────────────────────────────
# 수집된 console error를 출력한다.
# 에러가 있으면 경고를 표시하고 사람이 확인하도록 안내.
# AI는 에러를 보고 자동으로 수정하지 않는다 —
# runtime error는 맥락 없이 판단 불가.
#
# Usage:
#   report_console_errors "login/login_otp_${DATE}.png"
# ────────────────────────────────────────────────────────────
report_console_errors() {
  local SCREENSHOT="${1:-unknown}"
  local ERRORS
  ERRORS=$(agent-browser eval "JSON.stringify(window.__consoleErrors)" 2>/dev/null \
    | tail -1 | tr -d '"' | sed 's/\\n/\n/g')

  if [ "$ERRORS" = "[]" ] || [ -z "$ERRORS" ]; then
    echo "  ✅ no console errors — $SCREENSHOT"
  else
    echo ""
    echo "  ⚠️  Console errors detected — $SCREENSHOT"
    echo "  사람이 직접 확인 후 수정 여부를 판단하세요:"
    agent-browser eval "window.__consoleErrors.join('\n')" 2>/dev/null \
      | tail -1 | tr -d '"' | tr ',' '\n' | sed 's/^/    /'
    echo ""
  fi

  # 다음 페이지를 위해 초기화
  agent-browser eval "window.__consoleErrors = [];" > /dev/null
}
