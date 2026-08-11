#!/usr/bin/env node
// 경로 한정 프레임워크 업그레이드 — 업스트림 template 의 "프레임워크 폴더만" 최신으로 덮어쓴다.
// 유저 콘텐츠(campaigns/ references/ presets/ .env.production)와 README.md(브랜딩)는 절대 안 건드린다.
// → 유저 작업과 충돌 없이 레시피/규칙/코드만 최신이 된다.  계약: .claude/rules/upstream-cli-contract.md
//
// 사용: pnpm run upgrade      (또는 pnpm doctor 가 자동 호출)
// 배포 모델 무관: git clone / fork / "Use this template" 전부 동작.
//   (canonical template 을 가리키는 리모트가 없으면 upstream 으로 자동 추가)

import { spawnSync } from 'node:child_process';

const CANONICAL = 'https://github.com/kvidai/marketing-studio-template.git';
const BRANCH = 'main';

// 프레임워크 = 우리가 갱신. 유저 콘텐츠(campaigns/references/presets)·README(브랜딩) 제외.
const FRAMEWORK_PATHS = [
  '.claude', '.agents', '.codex', '.mcp.json', 'AGENTS.md', 'CLAUDE.md',
  'apm.yml', 'context', 'docs', 'packages', 'public', 'scripts',
  'skills-lock.json', 'tsconfig.base.json', 'package.json',
  'pnpm-workspace.yaml', 'pnpm-lock.yaml', '.gitignore',
  '.env.example', '.env.examplebrand.example',
];

const git = (args) => spawnSync('git', args, { encoding: 'utf-8' });
const norm = (u) => (u || '').trim().replace(/\.git$/, '').replace(/\/$/, '');

// 0) git repo 인가?
if (git(['rev-parse', '--is-inside-work-tree']).status !== 0) {
  console.log('ℹ git 저장소가 아니라 프레임워크 업그레이드를 건너뜁니다 (파일복사/스캐폴드 사용 시 정상).');
  process.exit(0);
}

// 1) canonical 을 가리키는 리모트 찾기 (없으면 upstream 추가)
let remote = null;
for (const line of (git(['remote', '-v']).stdout || '').split('\n')) {
  const m = line.match(/^(\S+)\s+(\S+)\s+\(fetch\)/);
  if (m && norm(m[2]) === norm(CANONICAL)) { remote = m[1]; break; }
}
if (!remote) {
  console.log(`▶ upstream 리모트 추가: ${CANONICAL}`);
  if (git(['remote', 'add', 'upstream', CANONICAL]).status !== 0) {
    console.error('✗ upstream 리모트 추가 실패');
    process.exit(1);
  }
  remote = 'upstream';
}

// 2) fetch
console.log(`▶ git fetch ${remote} ${BRANCH} ...`);
const f = git(['fetch', remote, BRANCH]);
if (f.status !== 0) {
  console.error(`✗ fetch 실패 (네트워크/권한 확인): ${f.stderr || ''}`);
  process.exit(1);
}

// 3) 프레임워크 경로만 upstream 최신으로 checkout (유저 콘텐츠 제외)
const ref = `${remote}/${BRANCH}`;
let ok = 0;
for (const p of FRAMEWORK_PATHS) {
  // 경로가 upstream 에 없으면 조용히 무시(신규/삭제 케이스). stderr 는 출력 안 함.
  if (git(['checkout', ref, '--', p]).status === 0) ok++;
}
console.log(`✓ 프레임워크 ${ok}/${FRAMEWORK_PATHS.length} 경로를 ${ref} 기준 최신으로 반영`);

// 4) 안내
const st = git(['status', '--short', ...FRAMEWORK_PATHS]).stdout || '';
if (st.trim()) {
  console.log('\n변경된 프레임워크 파일:');
  process.stdout.write(st.endsWith('\n') ? st : st + '\n');
  console.log('다음:');
  console.log('  1) pnpm install   # 의존성이 바뀌었을 수 있음');
  console.log('  2) 확인 후 커밋: git commit -m "chore: upgrade framework"');
} else {
  console.log('\n이미 최신입니다 — 변경 없음.');
}
console.log('\n※ campaigns/ references/ presets/ .env.production / README.md 는 건드리지 않았습니다(유저 소유).');
