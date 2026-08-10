#!/usr/bin/env node
// 비개발자용 원클릭 셋업 — .env.production 을 로컬에 생성하고 kvid 키를 채운다.
// ⚠️ .env.production 은 gitignore 되어 있다(실제 키). 절대 커밋하지 않는다.
//
// 사용:
//   pnpm setup                                  # 대화형: 키/이메일 물어봄
//   pnpm setup --api-key <KEY> --email <EMAIL>  # 비대화형(에이전트/CI)
//
// 하는 일:
//   1) .env.production 없으면 .env.example 에서 복사
//   2) KVIDAI_API_KEY / KVIDAI_USER_EMAIL 값을 입력받아 기입 (기존 값 교체)

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.production');
const examplePath = resolve(root, '.env.example');

function flag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function ask(question, current) {
  if (!stdin.isTTY) return current; // 비대화형인데 값 없으면 그대로 둠
  const rl = createInterface({ input: stdin, output: stdout });
  const shown = current && !/your-|your_|example\.com/.test(current) ? ` [${current}]` : '';
  const a = (await rl.question(`${question}${shown}: `)).trim();
  rl.close();
  return a || current;
}

// .env.production 준비 (없으면 example 복사)
if (!existsSync(envPath)) {
  if (!existsSync(examplePath)) {
    console.error('.env.example 이 없어 셋업할 수 없습니다.');
    process.exit(1);
  }
  copyFileSync(examplePath, envPath);
  console.log('✓ .env.production 생성 (.env.example 복사)');
}

let text = readFileSync(envPath, 'utf-8');

// 현재 값 읽기 (플레이스홀더면 무시)
const cur = (k) => {
  const m = text.match(new RegExp(`^\\s*#?\\s*${k}\\s*=\\s*(.*)$`, 'm'));
  return m ? m[1].replace(/\s+#.*$/, '').trim() : '';
};

let apiKey = flag('api-key') ?? (await ask('kvid API 키 (app.kvid.ai/settings)', cur('KVIDAI_API_KEY')));
let email = flag('email') ?? (await ask('kvid 계정 이메일 (크레딧 식별)', cur('KVIDAI_USER_EMAIL')));

if (!apiKey || /your-|your_/.test(apiKey)) {
  console.error('\n⚠️  KVIDAI_API_KEY 가 비어 있습니다. app.kvid.ai/settings 에서 발급 후 다시 실행하거나 .env.production 을 직접 편집하세요.');
}

// 값 기입 (주석 처리된 줄도 활성화하며 교체, 없으면 추가)
function setKey(t, k, v) {
  if (!v) return t;
  const re = new RegExp(`^\\s*#?\\s*${k}\\s*=.*$`, 'm');
  const line = `${k}=${v}`;
  return re.test(t) ? t.replace(re, line) : `${t.trimEnd()}\n${line}\n`;
}
text = setKey(text, 'KVIDAI_API_KEY', apiKey);
text = setKey(text, 'KVIDAI_USER_EMAIL', email);
writeFileSync(envPath, text);

const mask = (s) => (s && s.length > 8 ? `${s.slice(0, 4)}…${s.slice(-2)}` : s ? '••••' : '(비어있음)');
console.log(`\n✓ .env.production 기입 완료`);
console.log(`  KVIDAI_API_KEY   = ${mask(apiKey)}`);
console.log(`  KVIDAI_USER_EMAIL= ${email || '(비어있음)'}`);
console.log(`\n다음: kvid CLI 설치(curl https://cli.kvid.ai/install -fsS | bash) 후 "영상 만들어줘" 로 시작.`);
console.log(`(.env.production 은 gitignore 됨 — 커밋되지 않습니다.)`);
