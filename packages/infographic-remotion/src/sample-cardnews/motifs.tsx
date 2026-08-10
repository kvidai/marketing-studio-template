// 샘플 family 전용 모티프 — 자연/로컬 테마. 전부 인라인 SVG/DOM(원본).
// **OS 이모지 금지** — headless chromium 이모지 폰트가 환경마다 달라 렌더가 재현되지 않는다.
import React from 'react';
import { palette as P } from './theme';

/** 겹겹 언덕 — 화면 하단에 깔리는 배경 지형. */
export const Hills: React.FC<{ w: number; h: number; drift: number }> = ({ w, h, drift }) => {
  const base = h * 0.72;
  return (
    <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={`M0 ${base + 60} Q ${w * 0.3} ${base - 40 + drift} ${w * 0.6} ${base + 30} T ${w} ${base} V ${h} H0 Z`} fill={P.leaf} opacity={0.5} />
      <path d={`M0 ${base + 150} Q ${w * 0.35} ${base + 60 - drift} ${w * 0.7} ${base + 130} T ${w} ${base + 90} V ${h} H0 Z`} fill={P.green} opacity={0.85} />
      <path d={`M0 ${base + 280} Q ${w * 0.45} ${base + 190 + drift} ${w * 0.9} ${base + 250} T ${w} ${base + 240} V ${h} H0 Z`} fill={P.forest} />
    </svg>
  );
};

/** 해 — 좌상/우상에 은은히. rays 회전. */
export const Sun: React.FC<{ size: number; spin: number }> = ({ size, spin }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <g transform={`rotate(${spin} 50 50)`}>
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x="48" y="4" width="4" height="16" rx="2" fill={P.sun} opacity={0.55} transform={`rotate(${i * 30} 50 50)`} />
      ))}
    </g>
    <circle cx="50" cy="50" r="24" fill={P.sun} />
  </svg>
);

/** 잎사귀 — 떠다니는 장식. */
export const Leaf: React.FC<{ size: number; tilt: number; color?: string; opacity?: number }> = ({ size, tilt, color = P.leaf, opacity = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${tilt}deg)`, opacity }}>
    <path d="M12 2 C5 5 3 15 5 22 C12 20 21 13 21 4 C16 6 11 9 9 15 C10 9 11 5 12 2 Z" fill={color} />
  </svg>
);

/** 새싹 — 모집 인원 카운트용. grow 0..1 로 줄기·잎이 자란다. */
export const Sprout: React.FC<{ size: number; grow: number }> = ({ size, grow }) => {
  const g = Math.max(0, Math.min(1, grow));
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 24 30" style={{ opacity: 0.3 + g * 0.7 }}>
      <rect x="11" y={24 - 12 * g} width="2" height={12 * g} rx="1" fill={P.forest} />
      <path d={`M12 ${24 - 8 * g} C ${12 - 9 * g} ${20 - 10 * g}, ${12 - 9 * g} ${14 - 8 * g}, 12 ${16 - 10 * g} Z`} fill={P.green} transform={`scale(${0.5 + 0.5 * g})`} transform-origin="12 20" />
      <path d={`M12 ${22 - 9 * g} C ${12 + 9 * g} ${18 - 11 * g}, ${12 + 9 * g} ${12 - 9 * g}, 12 ${14 - 11 * g} Z`} fill={P.leaf} transform={`scale(${0.5 + 0.5 * g})`} transform-origin="12 20" />
      <circle cx="12" cy="27" r="2.4" fill={P.clay} opacity={0.8} />
    </svg>
  );
};

/** 이정표 마커 — 로드맵 스텝 앞 원형 핀. pop 0..1. */
export const Milestone: React.FC<{ size: number; pop: number; hot?: boolean }> = ({ size, pop, hot }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ opacity: pop, transform: `scale(${0.6 + pop * 0.4})` }}>
    <circle cx="12" cy="12" r="10" fill={hot ? P.sun : P.green} />
    <circle cx="12" cy="12" r="4.5" fill={P.cream} />
  </svg>
);

/** 붓 밑줄 — 강조 조각 아래 그린 획. draw 0..1. */
export const BrushUnderline: React.FC<{ draw: number }> = ({ draw }) => (
  <span
    style={{
      position: 'absolute',
      left: 0,
      right: `${(1 - draw) * 100}%`,
      bottom: 2,
      height: 12,
      background: P.leaf,
      opacity: 0.55,
      borderRadius: 6,
      zIndex: -1,
    }}
  />
);

/** 수화기 — 문의 앞. ring 주기로 흔들림. */
export const Phone: React.FC<{ size: number; ring: number; color?: string }> = ({ size, ring, color = P.forest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${Math.sin(ring * Math.PI * 8) * 12}deg)`, flexShrink: 0 }}>
    <path
      d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1.1l-2.2 2.1z"
      fill={color}
    />
  </svg>
);

/** 걷는 사람(단순 실루엣) — about 씬에서 길 위를 지나간다. */
export const Walker: React.FC<{ size: number; step: number; color?: string }> = ({ size, step, color = P.forest }) => {
  const swing = Math.sin(step * Math.PI * 2) * 18;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="4.5" r="3" fill={color} />
      <rect x="10.5" y="7.5" width="3" height="9" rx="1.5" fill={color} />
      <rect x="11" y="15" width="2.2" height="8" rx="1.1" fill={color} transform={`rotate(${swing} 12 15)`} />
      <rect x="10.8" y="15" width="2.2" height="8" rx="1.1" fill={color} transform={`rotate(${-swing} 12 15)`} />
    </svg>
  );
};
