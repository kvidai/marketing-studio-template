// 씬 전환과 무관하게 계속 살아 있는 배경 레이어(Sequence 바깥). 라이트 자연 테마.
import React from 'react';
import { interpolate } from 'remotion';
import { palette as P, fonts as F } from './theme';
import { Hills, Sun, Leaf } from './motifs';

// 프레임 독립 렌더 → Math.random 금지. 인덱스 해시를 난수 대신 쓴다.
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 91.7 + salt * 47.3) * 43758.5453;
  return x - Math.floor(x);
};

/** 하늘(크림→소프트 스카이) + 하단 언덕 + 해. 아주 천천히 숨쉰다. */
export const Scenery: React.FC<{ frame: number; w: number; h: number }> = ({ frame, w, h }) => {
  const breathe = Math.sin((frame / 240) * Math.PI * 2) * 10;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, ${P.sky} 0%, ${P.cream} 42%, ${P.cream} 100%)`,
        }}
      />
      {/* 부드러운 햇살 워시 (우상단) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(60% 40% at 88% 10%, rgba(242,179,62,0.22) 0%, rgba(242,179,62,0) 62%)`,
        }}
      />
      <div style={{ position: 'absolute', right: 70, top: 120 }}>
        <Sun size={150} spin={frame * 0.15} />
      </div>
      <Hills w={w} h={h} drift={breathe} />
      {/* 하단 살짝 어둡게 — 브랜드바 가독 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, rgba(38,56,43,0) 78%, rgba(38,56,43,0.28) 100%)`,
        }}
      />
    </>
  );
};

/** 떠다니는 잎 — 천천히 아래로, 살랑이며. */
export const FloatingLeaves: React.FC<{ frame: number; w: number; h: number }> = ({ frame, w, h }) => {
  const t = frame / 30;
  return (
    <>
      {Array.from({ length: 14 }, (_, i) => {
        const drift = (t * (8 + rand(i, 2) * 10)) % (h + 240);
        const x = rand(i, 3) * w + Math.sin(t * (0.4 + rand(i, 5)) + i) * 30;
        const y = ((rand(i, 4) * (h + 240) + drift) % (h + 240)) - 120;
        const tilt = Math.sin(t * (0.5 + rand(i, 6)) + rand(i, 7) * 6) * 40;
        const tone = rand(i, 8) > 0.5 ? P.leaf : rand(i, 8) > 0.25 ? P.green : P.sun;
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y }}>
            <Leaf size={20 + rand(i, 9) * 26} tilt={tilt} color={tone} opacity={0.22 + rand(i, 10) * 0.28} />
          </div>
        );
      })}
    </>
  );
};

/** 좌상단 워드마크 pill (샘플 ON 프로젝트). */
export const Wordmark: React.FC<{ text: string; enter: number }> = ({ text, enter }) => (
  <div
    style={{
      position: 'absolute',
      left: 64,
      top: 66,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      padding: '13px 30px 15px',
      borderRadius: 999,
      background: P.forest,
      color: P.cream,
      fontFamily: F.body,
      fontWeight: 800,
      fontSize: 33,
      letterSpacing: 0.5,
      opacity: enter,
      transform: `translateY(${interpolate(enter, [0, 1], [-20, 0])}px)`,
      boxShadow: '0 10px 22px rgba(38,56,43,0.28)',
    }}
  >
    <span style={{ width: 14, height: 14, borderRadius: '50%', background: P.sun, display: 'inline-block' }} />
    {text}
  </div>
);

/** 하단 브랜드 바 — 주최. */
export const BrandBar: React.FC<{ text: string; enter: number }> = ({ text, enter }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 52,
      textAlign: 'center',
      fontFamily: F.body,
      fontWeight: 700,
      fontSize: 30,
      letterSpacing: 2,
      color: P.cream,
      opacity: enter * 0.95,
    }}
  >
    {text}
  </div>
);
