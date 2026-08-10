// 카드뉴스 씬별 나레이션 TTS 를 만들고, 음성 길이에 맞춰 <family>-cardnews.json 의 durationSec 을
// 다시 잡는다. (영상 길이를 먼저 정하고 나레이션을 밀어넣으면 잘리거나 남는다 — 음성이 기준.)
//
// 실행: node packages/video-template/scripts/build-voice.mjs --campaign=<slug> [--force]
//   env: KVIDAI_API_KEY / KVIDAI_USER_EMAIL (없으면 .env.production 에서 로드 시도)
//
// 입력: campaigns/<slug>/narration.json
//   { voiceId, lang, speed, cardnewsFile, minScene:[초...], lead?, tail?, lines:[씬별 대본...] }
// 출력:
//   assets/voice/voice{N}.mp3 (+ voice{N}.json 캐시)
//   voice-timeline.json  (build-kvid-voice.mjs 가 읽어 리드인 무음 패딩)
//   <cardnewsFile>       durationSec 갱신 (→ render-<family> 재렌더 필요)

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const campaign = process.argv.slice(2).find((a) => a.startsWith('--campaign='))?.replace('--campaign=', '');
const force = process.argv.includes('--force');
if (!campaign) { console.error('Usage: build-voice.mjs --campaign=<slug> [--force]'); process.exit(1); }

const repoRoot = resolve(process.cwd(), '../..');
// TTS 는 배포된 kvid CLI (voice generate) 로. KVIDAI_CLI_BIN 로 로컬 바이너리 오버라이드 가능.
const KVID = process.env.KVIDAI_CLI_BIN || 'kvid';
const campaignDir = resolve(repoRoot, 'campaigns', campaign);

// env 폴백: 이미 export 돼 있으면 그걸 쓰고, 아니면 .env.production 에서 KVIDAI_* 로드
if (!process.env.KVIDAI_API_KEY && existsSync(resolve(repoRoot, '.env.production'))) {
  for (const line of readFileSync(resolve(repoRoot, '.env.production'), 'utf-8').split('\n')) {
    const m = line.match(/^\s*(KVIDAI_[A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/#.*$/, '').replace(/^["']|["']$/g, '').trim();
  }
}
if (!process.env.KVIDAI_API_KEY) { console.error('KVIDAI_API_KEY 미설정'); process.exit(1); }

const nar = JSON.parse(readFileSync(resolve(campaignDir, 'narration.json'), 'utf-8'));
const cardnewsPath = resolve(campaignDir, nar.cardnewsFile);
const cardnews = JSON.parse(readFileSync(cardnewsPath, 'utf-8'));
const LEAD = nar.lead ?? 0.35;
const TAIL = nar.tail ?? 0.5;
const minScene = nar.minScene ?? cardnews.scenes.map(() => 0);

if (nar.lines.length !== cardnews.scenes.length)
  { console.error(`씬 수 불일치: narration ${nar.lines.length} vs cardnews ${cardnews.scenes.length}`); process.exit(1); }

const voiceDir = resolve(campaignDir, 'assets', 'voice');
mkdirSync(voiceDir, { recursive: true });

const tracks = [];
for (let i = 0; i < nar.lines.length; i++) {
  const text = nar.lines[i];
  const out = resolve(voiceDir, `voice${i + 1}.mp3`);
  const metaPath = resolve(voiceDir, `voice${i + 1}.json`);
  if (!force && existsSync(out) && existsSync(metaPath)) {
    const cached = JSON.parse(readFileSync(metaPath, 'utf-8'));
    if (cached.text === text) { console.log(`  ${i + 1}/${nar.lines.length} 캐시 (${cached.duration}s)`); tracks.push({ duration: cached.duration }); continue; }
  }
  console.log(`  ${i + 1}/${nar.lines.length} 생성: ${text.slice(0, 26)}...`);
  const stdout = execFileSync(KVID,
    ['voice', 'generate', text, '--voice-id', nar.voiceId, '--lang', nar.lang, '--speed', String(nar.speed), '--output', out, '--json'],
    { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
  const json = JSON.parse(stdout.slice(stdout.indexOf('{', stdout.lastIndexOf('\n{'))));
  const duration = json.duration_seconds;
  if (typeof duration !== 'number') { console.error(`duration_seconds 없음 (씬 ${i + 1})`); process.exit(1); }
  writeFileSync(metaPath, JSON.stringify({ text, duration }, null, 2));
  console.log(`      → ${duration}s`);
  tracks.push({ duration });
}

let cursor = 0;
const timeline = tracks.map((t, i) => {
  const durationSec = Math.round(Math.max(minScene[i] || 0, LEAD + t.duration + TAIL) * 100) / 100;
  cardnews.scenes[i].durationSec = durationSec;
  const entry = {
    scene: i + 1,
    file: `assets/voice/voice${i + 1}.mp3`,
    voiceDuration: t.duration,
    sceneStart: Math.round(cursor * 100) / 100,
    durationSec,
    offset: Math.round((cursor + Math.max(LEAD, (durationSec - t.duration) / 2)) * 100) / 100,
  };
  cursor += durationSec;
  return entry;
});

writeFileSync(resolve(campaignDir, 'voice-timeline.json'), JSON.stringify({ totalSec: Math.round(cursor * 100) / 100, tracks: timeline }, null, 2) + '\n');
writeFileSync(cardnewsPath, JSON.stringify(cardnews, null, 2) + '\n');

console.log('\n씬 길이 재조정:');
for (const t of timeline) console.log(`  씬 ${t.scene}: 음성 ${String(t.voiceDuration).padStart(5)}s → 씬 ${String(t.durationSec).padStart(5)}s`);
console.log(`\n총 ${Math.round(cursor * 100) / 100}초 · 다음: render-<family> --name=cardnews-silent 재렌더 → build-kvid-voice → video-template(cardnews)`);
