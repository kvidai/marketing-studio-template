// 카드뉴스 완결 MP4(무음 마스터)를 씬 경계로 잘라 씬별 클립으로 만든다.
//
// 왜: kvid.ai composition 에 카드뉴스를 "씬 단위"로 얹어야 에디터 타임라인에서 순서·길이를
// 편집할 수 있다(통짜 1개면 편집할 게 없다). Remotion 배경 모션은 절대 프레임 기준이라
// 마스터를 프레임 구간으로 잘라도 계열 render-*-cardnews 의 --clips 와 동일한 결과가 나온다.
//
// 프레임 경계는 buildComposition 의 씬 길이 계산(Math.round(durationSec*fps))과 반드시 일치해야
// 클립 길이와 composition 아이템 길이가 어긋나지 않는다.

import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface SplitClip {
  file: string; // outDir 기준 파일명 (clip-01.mp4 …)
  durationSec: number; // 씬 원본 길이 (composition 이 그대로 사용)
  frames: number; // 이 클립의 프레임 수
}

/**
 * masterPath(무음 완결 MP4)를 durationsSec 경계로 잘라 outDir 에 <prefix>clip-NN.mp4 로 저장한다.
 * @param prefix 파일명 접두사(캠페인 slug 등). kvid.ai 미디어 라이브러리는 **파일명으로 자산을 식별**하므로
 *   여러 캠페인이 같은 계정을 쓰면 "clip-01.mp4" 같은 범용 이름이 **충돌**해 에디터가 다른 캠페인의
 *   동명 자산을 잘못 물어온다(다른 캠페인의 동명 클립이 뜬다). 캠페인별 고유 접두사로 방지한다.
 * @returns 씬 순서대로의 클립 목록
 */
export function splitClips(
  masterPath: string,
  durationsSec: number[],
  fps: number,
  outDir: string,
  prefix = '',
): SplitClip[] {
  if (!existsSync(masterPath)) throw new Error(`무음 마스터 없음: ${masterPath}`);
  mkdirSync(outDir, { recursive: true });

  const clips: SplitClip[] = [];
  let cursor = 0; // 프레임 커서 — buildComposition 과 동일하게 누적
  for (let i = 0; i < durationsSec.length; i++) {
    const dur = Math.max(1, Math.round(durationsSec[i] * fps));
    const from = cursor;
    const to = cursor + dur - 1; // between() 는 양끝 포함
    cursor += dur;

    const name = `${prefix}clip-${String(i + 1).padStart(2, '0')}.mp4`;
    const out = resolve(outDir, name);
    // 프레임 정확 분할: select 로 구간을 고르고 setpts 로 타임스탬프를 0 부터 다시 매긴다.
    // -an: 오디오 제거(나레이션은 composition 에서 별도 오디오 아이템으로 얹는다).
    // yuv420p: kvid.ai/에디터 호환(다른 포맷은 프리뷰가 멈추는 사례가 있었다).
    execFileSync(
      'ffmpeg',
      [
        '-y', '-loglevel', 'error',
        '-i', masterPath,
        '-vf', `select='between(n\\,${from}\\,${to})',setpts=N/FRAME_RATE/TB`,
        '-frames:v', String(dur),
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an',
        out,
      ],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    );
    clips.push({ file: name, durationSec: durationsSec[i], frames: dur });
  }
  return clips;
}
