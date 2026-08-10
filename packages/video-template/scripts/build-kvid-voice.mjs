// 카드뉴스 composition 용 나레이션을 만든다 — 각 씬 음성 앞에 리드인 무음을 덧대는 것이 전부.
//
// 왜: send-video-kvidai 의 buildComposition 은 오디오 아이템 from 을 "씬 시작"에 고정한다.
// 씬 안에서 음성을 늦출 수 없어, 그대로 올리면 카드가 페이드인하는 중에 첫 음절이 나온다.
// voice-timeline.json 의 offset(씬 시작 대비 음성 시작)만큼 무음을 앞에 붙여 맞춘다.
//
// 실행: node packages/video-template/scripts/build-kvid-voice.mjs --campaign=<slug>
// 입력: campaigns/<slug>/voice-timeline.json  (tracks[].{scene,file,sceneStart,offset,durationSec})
// 출력: campaigns/<slug>/assets/voice-kvid/voice{N}.mp3   (video.json cardnews 모드 voiceDir)

import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const campaign = process.argv.slice(2).find((a) => a.startsWith('--campaign='))?.replace('--campaign=', '');
if (!campaign) {
  console.error('Usage: build-kvid-voice.mjs --campaign=<slug>');
  process.exit(1);
}
const campaignDir = resolve(process.cwd(), '../../campaigns', campaign);
const timelinePath = resolve(campaignDir, 'voice-timeline.json');
if (!existsSync(timelinePath)) {
  console.error(`voice-timeline.json 없음: ${timelinePath}`);
  process.exit(1);
}

const timeline = JSON.parse(readFileSync(timelinePath, 'utf-8'));
const outDir = resolve(campaignDir, 'assets', 'voice-kvid');
mkdirSync(outDir, { recursive: true });

for (const t of timeline.tracks) {
  const src = resolve(campaignDir, t.file);
  if (!existsSync(src)) {
    console.error(`나레이션 없음: ${src}`);
    process.exit(1);
  }
  const lead = Math.round((t.offset - t.sceneStart) * 1000) / 1000; // 씬 시작 대비 음성 시작
  const out = resolve(outDir, `voice${t.scene}.mp3`);

  // adelay 로 앞에 무음. all=1 이라야 모노/스테레오 상관없이 전 채널이 함께 밀린다.
  execFileSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', src, '-af', `adelay=${Math.round(lead * 1000)}:all=1`, '-c:a', 'libmp3lame', '-b:a', '192k', out],
    { stdio: 'inherit' },
  );

  const dur = Number(
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], { encoding: 'utf-8' }).trim(),
  );
  const flag = dur <= t.durationSec + 0.05 ? '✓' : '⚠ 씬보다 김';
  console.log(`  씬 ${t.scene}: 리드인 ${lead}s → ${dur.toFixed(2)}s / 씬 ${t.durationSec}s  ${flag}`);
}

console.log(`\n✓ ${outDir}`);
