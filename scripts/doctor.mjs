#!/usr/bin/env node
// 원클릭 진단·갱신 — kvid CLI 와 플랫폼 스킬을 최신으로 맞춘다.
// 업스트림(API/web → kvidai-cli / kvidai-skills) 변경을 자연스럽게 따라가
// "과거버전으로 인한 조용한 오류"를 예방한다. 계약: .claude/rules/upstream-cli-contract.md
//
// 사용: pnpm doctor
//
// 하는 일:
//   1) kvid 설치 확인 (없으면 설치 안내 후 종료)
//   2) kvid update          — 최신 CLI 로 자기 갱신
//   3) kvid skills install   — 플랫폼 스킬 최신화 (실패해도 핵심 흐름은 CLI 만으로 동작)
//   4) 최종 버전 출력

import { spawnSync } from 'node:child_process';

const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf-8' });
const parseVer = (out) => {
  try {
    return JSON.parse((out ?? '').slice((out ?? '').indexOf('{'))).version ?? '';
  } catch {
    return '';
  }
};

// 1) 설치 확인
const v = run('kvid', ['--version', '--json']);
if (v.error) {
  console.error('✗ kvid CLI 가 설치되어 있지 않습니다.');
  console.error('  설치(macOS/Linux): curl https://cli.kvid.ai/install -fsS | bash');
  console.error('  설치(Windows PS) : irm https://cli.kvid.ai/install.ps1 | iex');
  process.exit(1);
}
const before = parseVer(v.stdout);
console.log(`현재 kvid: ${before || '(알 수 없음)'}`);

// 2) update
console.log('\n▶ kvid update ...');
const up = run('kvid', ['update']);
process.stdout.write(up.stdout || '');
process.stderr.write(up.stderr || '');

// 3) skills install (선택 — 실패해도 치명적 아님)
console.log('\n▶ kvid skills install ...');
const sk = run('kvid', ['skills', 'install']);
process.stdout.write(sk.stdout || '');
if (sk.status !== 0) console.log('  (스킬 설치 건너뜀/실패 — 핵심 영상 흐름은 kvid CLI 만으로 동작함)');

// 4) 최종 버전
const after = parseVer(run('kvid', ['--version', '--json']).stdout);
console.log(`\n✓ 완료. kvid: ${after || before}`);
console.log('  문제 지속 시 재설치: curl https://cli.kvid.ai/install -fsS | bash');
